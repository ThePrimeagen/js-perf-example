use std::sync::{atomic::AtomicUsize, Arc, Mutex};

use anyhow::Result;
use clap::Parser;
use futures_util::{stream::StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;

// the tag is the type value
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum Message {
    #[serde(rename = "start")]
    Start,
    #[serde(rename = "stop")]
    Stop {
        ticks: u32,

        #[serde(rename = "bulletsFired")]
        bullets_fired: u32,

        won: bool,
        error_msg: Option<String>,
    },
    #[serde(rename = "fire")]
    Fire,
    #[serde(rename = "error")]
    Error { msg: String },

    #[serde(rename = "timeout")]
    Timeout,
}

#[derive(Debug, Parser)]
struct Config {
    #[clap(short, long, default_value_t = 42069)]
    port: usize,

    #[clap(long, default_value = "0.0.0.0")]
    host: String,

    #[clap(short, long, default_value_t = 10000)]
    games: usize,

    #[clap(short, long, default_value_t = 120)]
    fast: u64,

    #[clap(short, long, default_value_t = 140)]
    slow: u64,

    #[clap(short, long, default_value_t = 2)]
    time_between: u64,

    #[clap(short = 'q', long, default_value_t = 100)]
    parallel: usize,

    #[clap(short, long, default_value_t = false)]
    debug: bool,
}

type Stream = WebSocketStream<MaybeTlsStream<TcpStream>>;

async fn run_client(stream: Stream, fire_wait: u64, config: &'static Config, player: usize) -> Result<Option<Message>> {
    let (mut write, mut read) = stream.split();

    let msg = read.next().await;
    if let Some(Ok(msg)) = msg {
        let msg: Message = serde_json::from_slice(&msg.into_data())?;
        match msg {
            Message::Fire | Message::Stop { .. } => {
                return Err(anyhow::anyhow!("message received isn't start message"));
            }
            _ => {}
        }
    } else {
        return Err(anyhow::anyhow!("failed to read start message"));
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel(2);

    let rx_loop = tokio::spawn(async move {
        loop {
            let msg = read.next().await;
            if let Some(Ok(msg)) = msg {
                let msg: Result<Message, _> = serde_json::from_slice(&msg.into_data());
                let msg = match msg {
                    Ok(msg) => msg,
                    Err(e) => {
                        _ = tx
                            .send(Message::Error {
                                msg: format!("failed at parsing: {:?}", e),
                            })
                            .await;
                        break;
                    }
                };

                _ = tx.send(msg).await;
            }
        }
    });

    let mut last_time = std::time::Instant::now();
    let mut stop: Option<Message> = None;
    loop {
        tokio::select! {
            msg = rx.recv() => {
                let msg = match msg {
                    Some(msg) => msg,
                    None => break,
                };

                if config.debug {
                    println!("DEBUG({}): {:?}", player, serde_json::to_string(&msg).unwrap());
                }

                match msg {
                    Message::Stop { .. } => {
                        stop = Some(msg);
                        break;
                    },
                    Message::Error { msg } => {
                        return Err(anyhow::anyhow!(msg));
                    },
                    _ => {},
                }
            },

            _ = tokio::time::sleep(
                tokio::time::Duration::from_millis(
                    (fire_wait as u64).saturating_sub(last_time.elapsed().as_millis() as u64))) => {

                last_time = std::time::Instant::now();
                write.send(tokio_tungstenite::tungstenite::Message::Text(
                    serde_json::to_string(&Message::Fire)?)).await?;
            }
        }
    }

    rx_loop.abort();

    return Ok(stop);
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct GameResult {
    ticks: usize,
    bullets_fired: usize,
    p1_won: usize,
    p2_won: usize,
}

impl GameResult {
    fn add(&mut self, msg: Message, player: usize) {
        if let Message::Stop {
            ticks,
            bullets_fired,
            won,
            ..
        } = msg
        {
            self.ticks += ticks as usize;
            self.bullets_fired += bullets_fired as usize;
            if won && player == 1 {
                self.p1_won += 1;
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let config: &'static Config = Box::leak(Box::new(Config::parse()));
    let url = format!("ws://{}:{}", config.host, config.port);
    let url: &'static Url = Box::leak(Box::new(Url::parse(&url)?));
    let semaphore = Arc::new(tokio::sync::Semaphore::new(config.parallel));
    let fails = Arc::new(AtomicUsize::new(0));
    let game_results = Arc::new(Mutex::new(GameResult::default()));
    let mut handles = Vec::new();
    let faster_player = config.fast;
    let slower_player = config.slow;

    for i in 0..config.games {
        let permit = semaphore.clone().acquire_owned().await?;

        if i % 1000 == 0 {
            println!("started: {}, fails: {}", i, fails.load(std::sync::atomic::Ordering::Relaxed));
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(config.time_between)).await;

        // helps prevent just a HUGE sloshing of games flying in at once
        let (s1, s2) =
            futures_util::join!(connect_async(url.as_str()), connect_async(url.as_str()));

        let s1 = match s1 {
            Ok((s, _)) => s,
            Err(e) => {
                println!("failed to connect to server: {:?}", e);
                continue;
            }
        };

        let s2 = match s2 {
            Ok((s, _)) => s,
            Err(e) => {
                println!("failed to connect to server: {:?}", e);
                continue;
            }
        };

        let fails = fails.clone();
        let game_results = game_results.clone();

        let handle = tokio::spawn(async move {
            // client 1 should always win
            let (s1, s2) =
                futures_util::join!(run_client(s1, faster_player, config, 1), run_client(s2, slower_player, config, 2));

            if let Ok(Some(Message::Timeout)) = s1 {
                println!("player1 timed out");
            }

            if let Ok(Some(Message::Timeout)) = s2 {
                println!("player2 timed out");
            }

            match (s1, s2) {
                (Ok(Some(s1)), Ok(Some(s2))) => {
                    if let Ok(mut game_results) = game_results.lock() {
                        game_results.add(s1, 1);
                        game_results.add(s2, 2);
                    }
                }
                (Ok(_), Err(_)) => {
                    fails.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
                (Err(_), Ok(_)) => {
                    fails.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
                (Err(_), Err(_)) => {
                    fails.fetch_add(2, std::sync::atomic::Ordering::Relaxed);
                }
                _ => unreachable!(),
            }

            drop(permit);
        });

        if handles.len() < config.parallel {
            handles.push(handle);
        } else {
            handles[i % config.parallel] = handle;
        }
    }

    futures_util::future::join_all(handles).await;

    println!("{:?}", game_results.lock().unwrap());

    return Ok(());
}
