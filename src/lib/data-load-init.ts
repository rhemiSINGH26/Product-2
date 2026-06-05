// Helper to load data from server on app startup
import { useData } from './data-store';

(async function loadData() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/courses');
    if (res.ok) {
      const json = await res.json();
      if (json.courses) {
        useData.setState({ courses: json.courses });
      }
    }
  } catch (err) {
    console.error('Failed to load courses', err);
  }

  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      if (json.users) {
        useData.setState({ users: json.users });
      }
    }
  } catch (err) {
    console.error('Failed to load users', err);
  }

  try {
    const res = await fetch('/api/certificates');
    if (res.ok) {
      const json = await res.json();
      if (json.certificates) {
        useData.setState({ certificates: json.certificates });
      }
    }
  } catch (err) {
    console.error('Failed to load certificates', err);
  }

  try {
    const res = await fetch('/api/assessments');
    if (res.ok) {
      const json = await res.json();
      if (json.assessments) {
        useData.setState({ assessments: json.assessments });
      }
    }
  } catch (err) {
    console.error('Failed to load assessments', err);
  }

  try {
    const res = await fetch('/api/submissions');
    if (res.ok) {
      const json = await res.json();
      if (json.submissions) {
        useData.setState({ submissions: json.submissions });
      }
    }
  } catch (err) {
    console.error('Failed to load submissions', err);
  }

  try {
    const res = await fetch('/api/progress');
    if (res.ok) {
      const json = await res.json();
      if (json.progress) {
        useData.setState({ progress: json.progress });
      }
    }
  } catch (err) {
    console.error('Failed to load progress', err);
  }

  try {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const json = await res.json();
      if (json.notifications) {
        useData.setState({ notifications: json.notifications });
      }
    }
  } catch (err) {
    console.error('Failed to load notifications', err);
  }

  try {
    const res = await fetch('/api/messages');
    if (res.ok) {
      const json = await res.json();
      if (json.messages) {
        useData.setState({ messages: json.messages });
      }
    }
  } catch (err) {
    console.error('Failed to load messages', err);
  }
})();
