import { io, Socket } from 'socket.io-client';
import { SocketRequest } from './SocketRequestReadable';
import * as http from 'http';
import { SocketResponse } from './SocketResponseWritable';

let socket: Socket;

interface LocalResponse {
    statusCode: number;
    statusMessage: string;
    headers: http.IncomingHttpHeaders;
}

interface ClientOptions {
    jwtToken: string;
    port: number; // local server port
    host: string; // local server URL or IP address, probably: localhost
    server: string; // server URL to connect via websocket
}

function initClient(options: ClientOptions) {
    socket = io(options.server, {
        transports: ['websocket'],
        auth: {
            token: options.jwtToken,
        },
    });

    socket.on('connect', () => {
        if (socket.connected) {
            console.log('client connect to server successfully');
        }
    });

    socket.on('connect_error', (e) => {
        console.log('connect error', e && e.message);
    });

    socket.on('disconnect', () => {
        console.log('client disconnected');
    });

    socket.on('request', (requestId, request) => {
        console.log(`${request.method}: `, request.path);
        request.port = options.port;
        request.hostname = options.host;
        const socketRequest = new SocketRequest({
            socket,
            requestId,
        });
        const localReq = http.request(request);
        socketRequest.pipe(localReq);
        const onSocketRequestError = (e: Error) => {
            socketRequest.off('end', onSocketRequestEnd);
            localReq.destroy(e);
        };
        const onSocketRequestEnd = () => {
            socketRequest.off('error', onSocketRequestError);
        };
        socketRequest.once('error', onSocketRequestError);
        socketRequest.once('end', onSocketRequestEnd);
        // ...
        // ...stream request and send request to local server...
        const onLocalResponse = (localRes: LocalResponse) => {
            localReq.off('error', onLocalError);
            const socketResponse = new SocketResponse({
                socket: socket,
                responseId: requestId,
            });
            socketResponse.writeHead(localRes.statusCode, localRes.statusMessage, localRes.headers);
            // @ts-ignore
            localRes.pipe(socketResponse);
        };
        const onLocalError = (error: Error) => {
            console.log(error);
            localReq.off('response', onLocalResponse);
            socket.emit('request-error', requestId, error && error.message);
            socketRequest.destroy(error);
        };
        localReq.once('error', onLocalError);
        localReq.once('response', onLocalResponse);
    });
}
