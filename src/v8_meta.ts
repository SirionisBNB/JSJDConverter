import axios from 'axios';

export async function getV8Context(config: any) {
    return axios.post(`${config.serverAddress}:${config.serverPort}/get_v8_context`, {
        token: config.token,
        who: config.who
    });
}

export async function getV8Metadata(config: any) {
    return axios.post(`${config.serverAddress}:${config.serverPort}/get_v8_metadata`, {
        token: config.token,
        who: config.who
    });
}
