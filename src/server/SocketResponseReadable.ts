import { Readable } from 'stream';
import { Socket } from 'socket.io';

export class SocketResponse extends Readable {
    socket: Socket;
    responseId: string;

    constructor({ socket, responseId }: { socket: Socket; responseId: string }) {
        super();
        this.socket = socket;
        this.responseId = responseId;
        const onResponse = (responseId: string, data: any) => {
            if (this.responseId === responseId) {
                this.socket.off('response', onResponse);
                this.socket.off('request-error', onRequestError);
                this.emit('response', data.statusCode, data.statusMessage, data.headers);
            }
        };
        const onResponsePipe = (responseId: string, data: any) => {
            if (this.responseId === responseId) {
                this.push(data);
            }
        };
        const onResponsePipes = (responseId: string, data: any) => {
            if (this.responseId === responseId) {
                data.forEach((chunk: any) => {
                    this.push(chunk);
                });
            }
        };
        const onResponsePipeError = (responseId: string, error: string) => {
            if (this.responseId !== responseId) {
                return;
            }
            this.socket.off('response-pipe', onResponsePipe);
            this.socket.off('response-pipes', onResponsePipes);
            this.socket.off('response-pipe-error', onResponsePipeError);
            this.socket.off('response-pipe-end', onResponsePipeEnd);
            this.destroy(new Error(error));
        };
        const onResponsePipeEnd = (responseId: string, data: any) => {
            if (this.responseId !== responseId) {
                return;
            }
            if (data) {
                this.push(data);
            }
            this.socket.off('response-pipe', onResponsePipe);
            this.socket.off('response-pipes', onResponsePipes);
            this.socket.off('response-pipe-error', onResponsePipeError);
            this.socket.off('response-pipe-end', onResponsePipeEnd);
            this.push(null);
        };
        const onRequestError = (requestId: string, error: string) => {
            if (requestId === this.responseId) {
                this.socket.off('request-error', onRequestError);
                this.socket.off('response', onResponse);
                this.socket.off('response-pipe', onResponsePipe);
                this.socket.off('response-pipes', onResponsePipes);
                this.socket.off('response-pipe-error', onResponsePipeError);
                this.socket.off('response-pipe-end', onResponsePipeEnd);
                this.emit('requestError', error);
            }
        };
        this.socket.on('response', onResponse);
        this.socket.on('response-pipe', onResponsePipe);
        this.socket.on('response-pipes', onResponsePipes);
        this.socket.on('response-pipe-error', onResponsePipeError);
        this.socket.on('response-pipe-end', onResponsePipeEnd);
        this.socket.on('request-error', onRequestError);
    }

    _read(size: number) {}
}
