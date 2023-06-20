import Http from './Hattp';

class ApiService extends Http {
  constructor() {
    super({
      baseURL: 'https://aspecta.id/api/v1',
    });
  }

  getSummary() {
    console.log('test2331')
    return this.get(`/new/api/home/profile/summary/`, { cache: 'no-store' });
  }
}

const apiService = new ApiService();

export default apiService;
