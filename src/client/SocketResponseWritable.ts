import { Writable } from 'stream';
import { Socket } from 'socket.io-client';
import * as http from 'http';

export class SocketResponse extends Writable {
    socket: Socket;
    responseId: string;

    constructor({ socket, responseId }: { socket: Socket; responseId: string }) {
        super();
        this.socket = socket;
        this.responseId = responseId;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: () => void) {
        this.socket.emit('response-pipe', this.responseId, chunk);
        const socketAsAny = this.socket as any;
        socketAsAny.engine.once('drain', () => {
            callback();
        });
    }

    _writev(
        chunks: {
            chunk: any;
            encoding: BufferEncoding;
        }[],
        callback: () => void
    ) {
        this.socket.emit('response-pipes', this.responseId, chunks);
        const socketAsAny = this.socket as any;
        socketAsAny.engine.once('drain', () => {
            callback();
        });
    }

    _final(callback: () => void) {
        this.socket.emit('response-pipe-end', this.responseId);
        const socketAsAny = this.socket as any;
        socketAsAny.engine.once('drain', () => {
            callback();
        });
    }

    _destroy(e: Error | null, callback?: () => void) {
        if (e) {
            this.socket.emit('response-pipe-error', this.responseId, e && e.message);
            const socketAsAny = this.socket as any;
            socketAsAny.engine.once('drain', () => {
                if (callback) {
                    callback();
                }
            });
            return;
        }
        if (callback) {
            callback();
        }
    }

    writeHead(statusCode: number, statusMessage: string, headers: http.IncomingHttpHeaders) {
        this.socket.emit('response', this.responseId, {
            statusCode,
            statusMessage,
            headers,
        });
    }
}
