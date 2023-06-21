import Http from './http';

const sleep = (timeInMS: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeInMS);
  });
};

class ApiService extends Http {
  constructor() {
    super({
      baseURL: 'http://localhost:3000',
    });
  }

  getSummary() {
    // return fetch('http://localhost:3000/fixtures/data.json', {cache: 'no-store'});
    // return this.get(`/fixtures/data.json`, { cache: 'no-store' })
    return this.get(`/api/data`, { cache: 'no-store' })
  }
}

const apiService = new ApiService();

export default apiService;
