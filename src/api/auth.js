// Simple login function that gets JWT
export const login = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Store the JWT token
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Function to get the stored token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Function to logout
export const logout = () => {
  localStorage.removeItem('token');
}; 