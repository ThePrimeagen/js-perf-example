FROM rust:1.72

WORKDIR /app
COPY Cargo.toml /app/Cargo.toml
COPY Cargo.lock /app/Cargo.lock
COPY src/main.rs /app/src/main.rs
COPY src/client.rs /app/src/client.rs
RUN cargo build --release

CMD ["./target/release/chat-js"]
