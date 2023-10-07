mod client;

#[tokio::main]
async fn main() {
    match client::client().await {
        Ok(_) => println!("Success!"),
        Err(e) => println!("Error: {}", e),
    }
}
