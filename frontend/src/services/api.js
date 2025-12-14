import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await axios.post(`${API_URL}/token`, formData);
    return response.data;
};

export const runSimulation = async (token, config) => {
    const response = await axios.post(`${API_URL}/simulate`, config, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};