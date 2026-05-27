const API_BASE_URL = "/api";

// Simple stateful JWT handlers
export const getToken = () => localStorage.getItem("auth_token");
export const setToken = (token) => localStorage.setItem("auth_token", token);
export const removeToken = () => localStorage.removeItem("auth_token");

export const getUser = () => {
  const user = localStorage.getItem("auth_user");
  return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem("auth_user", JSON.stringify(user));
export const removeUser = () => localStorage.removeItem("auth_user");

async function request(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "An error occurred during the request execution.");
  }

  return data;
}

export const api = {
  auth: {
    login: async (email, password) => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (res.token) {
        setToken(res.token);
        setUser(res.user);
      }
      return res.user;
    },
    register: async (userData) => {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData)
      });
    },
    logout: () => {
      removeToken();
      removeUser();
    }
  },
  leaves: {
    apply: async (leaveData) => {
      return request("/leaves/apply", {
        method: "POST",
        body: JSON.stringify(leaveData)
      });
    },
    getMy: async () => {
      return request("/leaves/my");
    },
    getPending: async () => {
      return request("/leaves/pending");
    },
    getAll: async (filters = {}) => {
      const query = new URLSearchParams(filters).toString();
      return request(`/leaves/all?${query}`);
    },
    approve: async (id, remarks) => {
      return request(`/leaves/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ remarks })
      });
    },
    reject: async (id, remarks) => {
      return request(`/leaves/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ remarks })
      });
    }
  },
  users: {
    getAll: async () => {
      return request("/users");
    },
    update: async (id, data) => {
      return request(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (id) => {
      return request(`/users/${id}`, {
        method: "DELETE"
      });
    }
  },
  notifications: {
    getLogs: async () => {
      return request("/notifications/history");
    }
  }
};
