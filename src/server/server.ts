import * as express from 'express';
import * as http from 'http';
import * as socketIo from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { SocketRequest } from './SocketRequestWritable';
import { uuid } from 'uuidv4';

const app = express();
const httpServer = http.createServer(app);
const io = new socketIo.Server(httpServer);

let connectedSocket: socketIo.Socket | null = null;

io.on('connection', (socket) => {
    console.log('client connected');
    connectedSocket = socket;

    const onMessage = (message: string) => {
        if (message === 'ping') {
            socket.send('pong');
        }
    };

    const onDisconnect = (reason: string) => {
        console.log('client disconnected: ', reason);
        connectedSocket = null;
        socket.off('message', onMessage);
        socket.off('error', onError);
    };

    const onError = (e: Error) => {
        connectedSocket = null;
        socket.off('message', onMessage);
        socket.off('disconnect', onDisconnect);
    };

    socket.on('message', onMessage);
    socket.once('disconnect', onDisconnect);
    socket.once('error', onError);
});

io.use((socket, next) => {
    if (connectedSocket) {
        return next(new Error('Connected error'));
    } else if (!socket.handshake.auth || !socket.handshake.auth.token || !process.env.SECRET_KEY) {
        next(new Error('Authentication error'));
    } else {
        jwt.verify(
            socket.handshake.auth.token,
            process.env.SECRET_KEY,
            function (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) {
                if (err) {
                    return next(new Error('Authentication error'));
                }
                if (
                    (typeof decoded === 'string' && decoded !== process.env.VERIFY_TOKEN) ||
                    (typeof decoded === 'object' && decoded.token !== process.env.VERIFY_TOKEN)
                ) {
                    return next(new Error('Authentication error'));
                }
                next();
            }
        );
    }
});

app.use('/', (req, res) => {
    if (!connectedSocket) {
        res.status(404);
        res.send('Not Found');
        return;
    }

    const requestId = uuid();
    const socketRequest = new SocketRequest({
        socket: connectedSocket,
        requestId,
        request: {
            method: req.method,
            headers: { ...req.headers },
            path: req.url,
        },
    });

    const onReqError = (e: string) => {
        socketRequest.destroy(new Error(e || 'Aborted'));
    };
    req.once('aborted', onReqError);
    req.once('error', onReqError);
    req.pipe(socketRequest);
    req.once('finish', () => {
        req.off('aborted', onReqError);
        req.off('error', onReqError);
    });
    // ...
    // ... stream request to tunnel client
    const onResponse = (statusCode: number, statusMessage: string, headers: http.IncomingHttpHeaders) => {
        socketRequest.off('requestError', onReqError);
        res.writeHead(statusCode, statusMessage, headers);
    };
    socketResponse.once('requestError', onReqError);
    socketResponse.once('response', onResponse);
    socketResponse.pipe(res);
    const onSocketError = () => {
        res.end(500);
    };
    socketResponse.once('error', onSocketError);
    connectedSocket.once('close', onSocketError);
    res.once('close', () => {
        connectedSocket.off('close', onSocketError);
        socketResponse.off('error', onSocketError);
    });
});

//start our server
httpServer.listen(process.env.PORT || 5050, () => {
    console.log(`Server started on port ${process.env.PORT || 5050} :)`);
});
