import * as WebSocket from "ws";

const wsc = new WebSocket("ws://localhost:5050", {
  headers: { "X-API-KEY": "fdjhg834yhg98dfh0897345" },
});

wsc.on("error", (err) => {
  console.error(err.message);
});

wsc.on("open", function open() {
  console.log("Connected");
});

wsc.on("message", (message: string) => {
  message = JSON.parse(message);
  console.log("New message: ", message);
});
