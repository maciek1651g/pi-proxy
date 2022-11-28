import { Writable } from 'stream';
import { Socket } from 'socket.io';
import * as http from 'http';

interface Request {
    method: string;
    headers: http.IncomingHttpHeaders;
    path: string;
}

export class SocketRequest extends Writable {
    socket: Socket;
    requestId: string;

    constructor({ socket, requestId, request }: { socket: Socket; requestId: string; request: Request }) {
        super();
        this.socket = socket;
        this.requestId = requestId;
        this.socket.emit('request', requestId, request);
    }

    _write(chunk: any, encoding: BufferEncoding, callback: () => void): void {
        this.socket.emit('request-pipe', this.requestId, chunk);
        this.socket.conn.once('drain', () => {
            callback();
        });
    }

    _writev(
        chunks: {
            chunk: any;
            encoding: BufferEncoding;
        }[],
        callback: () => void
    ): void {
        this.socket.emit('request-pipes', this.requestId, chunks);
        this.socket.conn.once('drain', () => {
            callback();
        });
    }

    _final(callback: () => void): void {
        this.socket.emit('request-pipe-end', this.requestId);
        this.socket.conn.once('drain', () => {
            callback();
        });
    }

    _destroy(e: Error, callback?: () => void): void {
        if (e) {
            this.socket.emit('request-pipe-error', this.requestId, e && e.message);
            this.socket.conn.once('drain', () => {
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
}
