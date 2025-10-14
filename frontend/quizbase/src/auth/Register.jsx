import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username:"", email:"", password:"", avatarUrl:"" });
  const submit = async (e) => { e.preventDefault(); await register(form); nav("/profile"); };
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-6 text-content">
      <h1 className="text-2xl font-bold">Create account</h1>
      <input className="w-full rounded border border-border px-3 py-2" placeholder="Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
      <input className="w-full rounded border border-border px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
      <input className="w-full rounded border border-border px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
      <input className="w-full rounded border border-border px-3 py-2" placeholder="Avatar URL (image link)" value={form.avatarUrl} onChange={e=>setForm(f=>({...f,avatarUrl:e.target.value}))}/>
      <button className="w-full rounded-md bg-brand-500 px-3 py-2 text-content-inverted transition hover:bg-brand-600">Register</button>
    </form>
  );
}
