import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const submit = async (e) => { e.preventDefault(); await login(form.email, form.password, form.rememberMe); nav("/profile"); };
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-6 text-content">
      <h1 className="text-2xl font-bold">Log in</h1>
      <input className="w-full rounded border border-border px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
      <input className="w-full rounded border border-border px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
      <label className="flex items-center gap-2 text-sm text-content-muted">
        <input type="checkbox" checked={form.rememberMe} onChange={e=>setForm(f=>({...f,rememberMe:e.target.checked}))}/> Remember me
      </label>
      <button className="w-full rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600">Sign in</button>
      <p className="text-sm text-content-muted">No account? <Link className="text-brand-600 underline" to="/register">Register</Link></p>
    </form>
  );
}
