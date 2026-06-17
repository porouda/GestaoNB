import axios from 'axios';

async function trigger() {
  try {
    const response = await axios.get('http://localhost:3000/api/seed-checklist');
    console.log('Seeding result:', response.data);
  } catch (error: any) {
    console.error('Trigger failed:', error.response?.data || error.message);
  }
}

trigger();
