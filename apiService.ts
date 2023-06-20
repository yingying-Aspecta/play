import Http from './http';

class ApiService extends Http {
  constructor() {
    super({
      baseURL: 'http://localhost:3000',
    });
  }

  getSummary() {
    console.log('test2331')
    return this.get(`/fixtures/data.json`, { cache: 'no-store' });
  }
}

const apiService = new ApiService();

export default apiService;
