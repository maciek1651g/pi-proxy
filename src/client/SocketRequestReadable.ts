import { Readable } from 'stream';
import { Socket } from 'socket.io-client';

export class SocketRequest extends Readable {
    socket: Socket;
    requestId: string;

    constructor({ socket, requestId }: { socket: Socket; requestId: string }) {
        super();
        this.socket = socket;
        this.requestId = requestId;
        const onRequestPipe = (requestId: string, data: any) => {
            if (this.requestId === requestId) {
                this.push(data);
            }
        };
        const onRequestPipes = (requestId: string, data: any) => {
            if (this.requestId === requestId) {
                data.forEach((chunk: any) => {
                    this.push(chunk);
                });
            }
        };
        const onRequestPipeError = (requestId: string, error: string) => {
            if (this.requestId === requestId) {
                this.socket.off('request-pipe', onRequestPipe);
                this.socket.off('request-pipes', onRequestPipes);
                this.socket.off('request-pipe-error', onRequestPipeError);
                this.socket.off('request-pipe-end', onRequestPipeEnd);
                this.destroy(new Error(error));
            }
        };
        const onRequestPipeEnd = (requestId: string, data: any) => {
            if (this.requestId === requestId) {
                this.socket.off('request-pipe', onRequestPipe);
                this.socket.off('request-pipes', onRequestPipes);
                this.socket.off('request-pipe-error', onRequestPipeError);
                this.socket.off('request-pipe-end', onRequestPipeEnd);
                if (data) {
                    this.push(data);
                }
                this.push(null);
            }
        };
        this.socket.on('request-pipe', onRequestPipe);
        this.socket.on('request-pipes', onRequestPipes);
        this.socket.on('request-pipe-error', onRequestPipeError);
        this.socket.on('request-pipe-end', onRequestPipeEnd);
    }

    _read() {}
}
