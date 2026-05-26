import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Form, Input, Label, TextField } from '@heroui/react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || '登录失败');
        return;
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('kinho-auth-changed'));
      navigate('/dashboard');
    } catch {
      setError('网络错误，请检查后端是否启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand Panel */}
      <div
        className="hidden w-1/2 items-center justify-center p-12 lg:flex"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        <div className="relative max-w-md">
          {/* Decorative gradients */}
          <div
            className="absolute -top-10 -right-10 h-48 w-48 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)',
            }}
          />

          {/* Logo */}
          <div className="relative z-10 mb-6 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              MG
            </div>
          </div>

          <h1 className="relative z-10 text-4xl font-bold text-white">Machinery Guard</h1>
          <p className="relative z-10 mt-3 text-lg text-slate-400">
            工程机械售后服务管理系统
          </p>
          <div className="relative z-10 mt-8 flex gap-4 text-sm text-slate-500">
            <span>可追踪</span>
            <span>·</span>
            <span>可审计</span>
            <span>·</span>
            <span>可扩展</span>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full items-center justify-center bg-[var(--background)] p-8 lg:w-1/2">
        <Card className="w-full max-w-md shadow-[var(--overlay-shadow)]">
          <Card.Header>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white lg:hidden"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
              >
                MG
              </div>
              <div>
                <Card.Title className="text-xl">登录</Card.Title>
                <Card.Description>请输入您的账号信息</Card.Description>
              </div>
            </div>
          </Card.Header>

          <Form data-testid="login-form" onSubmit={handleSubmit}>
            <Card.Content>
              <div className="flex flex-col gap-4">
                <TextField
                  data-testid="login-username"
                  name="username"
                  value={username}
                  onChange={setUsername}
                  isRequired
                >
                  <Label className="flex items-center gap-2">
                    <User size={14} className="text-[var(--muted)]" />
                    用户名
                  </Label>
                  <Input placeholder="请输入用户名" variant="secondary" />
                </TextField>

                <TextField
                  data-testid="login-password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  type={showPassword ? 'text' : 'password'}
                  isRequired
                >
                  <Label className="flex items-center gap-2">
                    <Lock size={14} className="text-[var(--muted)]" />
                    密码
                  </Label>
                  <Input placeholder="请输入密码" variant="secondary" />
                </TextField>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1.5 self-end text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPassword ? '隐藏密码' : '显示密码'}
                </button>
              </div>
            </Card.Content>

            <Card.Footer className="mt-2 flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}
              <Button data-testid="login-submit" type="submit" className="w-full" size="lg" isDisabled={loading}>
                {loading ? '登录中...' : '登 录'}
              </Button>
              <p className="text-center text-xs text-[var(--muted)]">
                初始密码登录后请立即修改
              </p>
            </Card.Footer>
          </Form>
        </Card>
      </div>
    </div>
  );
}
