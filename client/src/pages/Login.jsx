import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData.email, formData.password);
      const { accessToken, refreshToken, user } = response.data;

      setTokens(accessToken, refreshToken, user);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.error === 'User not registered') {
        navigate('/register', {
          state: {
            email: formData.email,
            error: 'This email is not registered. Please sign up to create an account.',
          },
        });
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-brown mb-2">
            StudySync
          </h1>
          <p className="text-brown-dark">Collaborative Exam Preparation</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card bg-white shadow-md"
        >
          <h2 className="text-2xl font-serif font-bold text-brown mb-6">
            Welcome Back
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="mb-4"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            className="mb-6"
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full mb-4"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>

          <p className="text-center text-brown-text">
            Don't have an account?{' '}
            <Link to="/register" className="text-brown font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
