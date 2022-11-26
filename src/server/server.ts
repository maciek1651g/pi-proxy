import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ noServer: true });
let client: WebSocket;

wss.on("connection", (ws: WebSocket, request) => {
  console.log("Server connection");
});

app.all("*", function (req, res, next) {
  console.log("http request");

  client.on("message", (data) => {
    res.send(data);
  });
});

server.on("upgrade", function upgrade(request, socket, head) {
  if (request.headers["x-api-key"] !== "fdjhg834yhg98dfh0897345") {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    client = ws;
    wss.emit("connection", ws, request);
  });
});

//start our server
server.listen(process.env.PORT || 5050, () => {
  console.log(`Server started on port ${process.env.PORT || 5050} :)`);
});
