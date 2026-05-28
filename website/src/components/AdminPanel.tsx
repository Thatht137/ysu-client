import { useState, useEffect } from 'react';

interface StatsEntry {
  ua: string;
  version?: string;
  viewport?: string;
  screen?: string;
  platform?: string;
  ts: number;
}

interface StatsData {
  count: number;
  entries: StatsEntry[];
}

interface FeedbackEntry {
  id?: string;
  rating: number;
  text: string;
  version?: string;
  viewport?: string;
  screen?: string;
  platform?: string;
  ua: string;
  ts: number;
  adminReply?: string;
  repliedAt?: number;
}

interface FeedbackData {
  entries: FeedbackEntry[];
}

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'stats' | 'feedback'>('stats');
  const [tab, setTab] = useState<'all' | 'unreplied' | 'replied'>('all');
  const [data, setData] = useState<StatsData | FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_password');
    if (saved) setSavedPassword(saved);
  }, []);

  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/admin?type=list', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) {
        throw new Error('密码错误');
      }
      sessionStorage.setItem('admin_password', password);
      setSavedPassword(password);
    } catch (err: any) {
      setLoginError(err.message || '验证失败');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_password');
    setSavedPassword('');
    setPassword('');
    setData(null);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const url =
        type === 'feedback'
          ? `/api/admin?type=all-feedback`
          : `/api/admin?type=${type}&date=${date}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${savedPassword}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!savedPassword) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 rounded-xl border border-border bg-card">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">管理员登录</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入管理员密码"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground mb-4 outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        {loginError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-sm">
            {loginError}
          </div>
        )}
        <button
          onClick={handleLogin}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer"
        >
          登录
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">数据管理面板</h1>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
        >
          退出登录
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {type === 'stats' && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as 'stats' | 'feedback');
            setData(null);
          }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="stats">统计数据</option>
          <option value="feedback">反馈数据</option>
        </select>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 cursor-pointer"
        >
          {loading ? '加载中...' : '查询'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      {data && type === 'stats' && <StatsView data={data as StatsData} />}
      {data && type === 'feedback' && (
        <>
          <div className="flex gap-1 mb-4">
            {(['all', 'unreplied', 'replied'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'all' ? '全部' : t === 'unreplied' ? '未回复' : '已回复'}
              </button>
            ))}
          </div>
          <FeedbackView
            data={data as FeedbackData}
            password={savedPassword}
            onRefresh={fetchData}
            tab={tab}
          />
        </>
      )}
    </div>
  );
}

function StatsView({ data }: { data: StatsData }) {
  return (
    <div>
      <div className="mb-4 p-4 rounded-xl border border-border bg-card">
        <div className="text-3xl font-bold text-card-foreground">{data.count}</div>
        <div className="text-muted-foreground">总访问次数</div>
      </div>

      {data.entries && data.entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">时间</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">UA</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">版本</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">平台</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">视口</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">屏幕</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry, i) => (
                <tr key={i} className="border-b border-border/50 last:border-b-0">
                  <td className="py-2 px-3 text-card-foreground whitespace-nowrap">
                    {new Date(entry.ts).toLocaleString('zh-CN')}
                  </td>
                  <td
                    className="py-2 px-3 text-card-foreground max-w-xs truncate"
                    title={entry.ua}
                  >
                    {entry.ua}
                  </td>
                  <td className="py-2 px-3 text-card-foreground">{entry.version || '-'}</td>
                  <td className="py-2 px-3 text-card-foreground">{entry.platform || '-'}</td>
                  <td className="py-2 px-3 text-card-foreground">{entry.viewport || '-'}</td>
                  <td className="py-2 px-3 text-card-foreground">{entry.screen || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FeedbackView({
  data,
  password,
  onRefresh,
  tab,
}: {
  data: FeedbackData;
  password: string;
  onRefresh: () => void;
  tab: 'all' | 'unreplied' | 'replied';
}) {
  const filtered = data.entries.filter((e) => {
    if (tab === 'all') return true;
    if (tab === 'unreplied') return !e.adminReply;
    return !!e.adminReply;
  });

  const avgRating =
    data.entries.length > 0
      ? (data.entries.reduce((sum, e) => sum + e.rating, 0) / data.entries.length).toFixed(1)
      : '0';

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-3xl font-bold text-card-foreground">{filtered.length}</div>
          <div className="text-muted-foreground">{tab === 'all' ? '反馈数量' : tab === 'unreplied' ? '未回复' : '已回复'}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-3xl font-bold text-card-foreground">{avgRating}</div>
          <div className="text-muted-foreground">平均评分</div>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((entry, i) => (
            <FeedbackCard
              key={i}
              entry={entry}
              password={password}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  entry,
  password,
  onRefresh,
}: {
  entry: FeedbackEntry;
  password: string;
  onRefresh: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState('');

  const handleReply = async () => {
    if (!replyText.trim() || !entry.id) return;
    setSending(true);
    setReplyError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ id: entry.id, reply: replyText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setReplyText('');
      setShowReply(false);
      onRefresh();
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-500">
          {'★'.repeat(entry.rating)}
          {'☆'.repeat(5 - entry.rating)}
        </span>
        <span className="text-muted-foreground text-sm">
          {new Date(entry.ts).toLocaleString('zh-CN')}
        </span>
        {entry.id && (
          <span className="text-xs text-muted-foreground font-mono">#{entry.id}</span>
        )}
        {entry.adminReply && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
            已回复
          </span>
        )}
      </div>
      {entry.text && <p className="text-card-foreground mb-2">{entry.text}</p>}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mb-3">
        <span>版本: {entry.version || '-'}</span>
        <span>平台: {entry.platform || '-'}</span>
        <span>视口: {entry.viewport || '-'}</span>
        <span>屏幕: {entry.screen || '-'}</span>
      </div>

      {entry.adminReply && (
        <div className="p-3 rounded-lg bg-muted/50 mb-3">
          <div className="text-xs text-muted-foreground mb-1">
            管理员回复 {entry.repliedAt ? new Date(entry.repliedAt).toLocaleString('zh-CN') : ''}
          </div>
          <p className="text-sm text-card-foreground">{entry.adminReply}</p>
        </div>
      )}

      {entry.id && (
        <div>
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              {entry.adminReply ? '追加回复' : '回复'}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="输入回复内容..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {replyError && (
                <div className="text-sm text-red-500">{replyError}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {sending ? '发送中...' : '发送'}
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReplyText('');
                    setReplyError('');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
