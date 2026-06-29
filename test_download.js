import axios from 'axios';

async function test() {
  const baseURL = 'http://ec2-13-60-247-126.eu-north-1.compute.amazonaws.com:10000/api';
  console.log('Attempting login...');
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    console.log('Login successful, token retrieved:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('Full login response:', loginRes.data);
      return;
    }
    
    console.log('Fetching monthly report...');
    const reportRes = await axios.get(`${baseURL}/treasurer/reports/main-fund/monthly`, {
      params: { monthYear: '2026-06' },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf,application/octet-stream'
      },
      responseType: 'arraybuffer'
    });
    
    console.log('Report response status:', reportRes.status);
    console.log('Report response headers:', reportRes.headers);
    console.log('Report response body length (bytes):', reportRes.data.byteLength);
  } catch (err) {
    console.error('Error occurred:', err.response ? {
      status: err.response.status,
      headers: err.response.headers,
      data: err.response.data ? err.response.data.toString() : null
    } : err.message);
  }
}

test();
