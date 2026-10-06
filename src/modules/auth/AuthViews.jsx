import React from 'react';
import { Star, Sparkles, Mail, Lock, ChevronRight, ShieldCheck } from 'lucide-react';
import { LOGO_URL } from '../../lib/firebase-auth.mjs';

export function AuthLoading() {
return (
    <div className="font-outfit min-h-[100dvh] relative overflow-hidden flex items-center justify-center bg-[linear-gradient(155deg,#F8F8FF_0%,#F4F6FF_48%,#FFF8FC_100%)]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');.font-outfit{font-family:'Outfit',sans-serif}@keyframes splashFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}@keyframes splashLoad{0%{width:8%}55%{width:64%}100%{width:88%}}@keyframes splashGlow{0%,100%{opacity:.28;transform:scale(.94)}50%{opacity:.48;transform:scale(1.06)}}.splash-logo{animation:splashFloat 3.2s ease-in-out infinite}.splash-load{animation:splashLoad 1.6s ease-in-out forwards}.splash-glow{animation:splashGlow 2.4s ease-in-out infinite}`}</style>
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#7657FF]/15 blur-2xl"></div>
      <div className="absolute -top-28 left-20 w-72 h-64 rounded-[45%] bg-[#FF3EA5]/10 blur-2xl rotate-12"></div>
      <div className="absolute -bottom-28 -right-24 w-96 h-80 rounded-[45%] bg-gradient-to-tr from-[#7657FF]/25 via-[#FF3EA5]/16 to-amber-300/18 blur-xl"></div>
      <Star className="absolute top-[12%] left-[18%] text-amber-300 fill-amber-200/70 rotate-12" size={28}/>
      <Star className="absolute top-[27%] right-[14%] text-[#7657FF]/35 fill-[#7657FF]/10 -rotate-12" size={24}/>
      <Sparkles className="absolute bottom-[20%] right-[18%] text-[#FF3EA5]/35" size={28}/>
      <div className="relative z-10 w-full max-w-[430px] px-8 text-center">
        <div className="relative mx-auto w-[82%] max-w-[330px] splash-logo">
          <div className="absolute inset-x-[10%] bottom-0 h-14 bg-[#7657FF]/25 blur-2xl rounded-full splash-glow"></div>
          <img src={LOGO_URL} alt="Diverty Recreación y eventos" className="relative w-full h-auto object-contain drop-shadow-[0_18px_28px_rgba(118,87,255,.12)]" crossOrigin="anonymous"/>
        </div>
        <div className="mt-20 mx-auto max-w-[250px]">
          <div className="h-[7px] rounded-full bg-slate-200/80 overflow-hidden shadow-inner"><div className="splash-load h-full rounded-full bg-gradient-to-r from-[#7657FF] via-[#B83DFF] to-[#FF3EA5] shadow-[0_0_16px_rgba(184,61,255,.35)]"></div></div>
          <p className="mt-4 text-[13px] font-semibold tracking-wide text-slate-500">Cargando tu experiencia...</p>
        </div>
      </div>
    </div>
  );
}

export function LoginView({ emailInput, setEmailInput, passwordInput, setPasswordInput, handleLogin, error }) {
return (
    <div className="font-outfit min-h-[100dvh] flex items-center justify-center px-5 py-8 relative overflow-hidden bg-[linear-gradient(155deg,#F8F9FF_0%,#F4F6FF_48%,#FFF8FC_100%)]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');.font-outfit{font-family:'Outfit',sans-serif}@keyframes portalFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes portalGlow{0%,100%{opacity:.2;transform:scale(.94)}50%{opacity:.42;transform:scale(1.06)}}.portal-logo{animation:portalFloat 4s ease-in-out infinite}.portal-glow{animation:portalGlow 3s ease-in-out infinite}`}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#7657FF]/18 blur-2xl"></div>
        <div className="absolute top-16 left-[18%] w-64 h-44 rounded-full bg-[#FF3EA5]/9 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#FF3EA5]/12 blur-2xl"></div>
        <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-[#7657FF]/16 blur-2xl"></div>
        <div className="absolute top-[8%] right-[7%] text-amber-300/80 rotate-12"><Star size={44}/></div>
        <div className="absolute top-[19%] right-[4%] text-[#FF3EA5]/35 -rotate-12"><Star size={72}/></div>
        <div className="absolute top-[15%] left-[8%] text-amber-300/70"><Sparkles size={27}/></div>
      </div>
      <div className="w-full max-w-[440px] relative z-10 rounded-[38px] bg-white/76 backdrop-blur-2xl border border-white shadow-[0_30px_80px_rgba(76,67,144,.13),inset_0_1px_0_rgba(255,255,255,.95)] px-6 sm:px-9 py-8 sm:py-10 animate-fadeInUp">
        <div className="flex justify-center">
          <div className="relative portal-logo">
            <div className="portal-glow absolute -inset-5 rounded-[34px] bg-gradient-to-tr from-[#7657FF] via-[#B83DFF] to-[#FF3EA5] blur-2xl"></div>
            <div className="relative w-[122px] h-[122px] rounded-[31px] bg-white/95 p-4 border border-white shadow-[0_18px_38px_rgba(118,87,255,.20)] flex items-center justify-center">
              <img src={LOGO_URL} alt="Diverty" className="w-full h-full object-contain" crossOrigin="anonymous"/>
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-[17px] bg-gradient-to-br from-amber-400 to-orange-500 border-[3px] border-white shadow-lg flex items-center justify-center rotate-12"><Star size={22} className="text-white fill-white"/></div>
          </div>
        </div>
        <div className="text-center mt-8 mb-8">
          <h1 className="text-[34px] sm:text-[38px] leading-none font-black tracking-[-.045em] text-slate-950">Portal <span className="bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] bg-clip-text text-transparent">Diverty</span></h1>
          <p className="mt-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-[.28em] text-slate-500">Gestión de Eventos Premium</p>
          <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] mx-auto mt-5"></div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Mail size={21} className="text-[#7657FF]/75 group-focus-within:text-[#7657FF]"/></div>
            <input type="email" required value={emailInput} onChange={(e)=>setEmailInput(e.target.value)} placeholder="Correo Electrónico" className="w-full h-[62px] rounded-[19px] bg-white/88 border border-slate-200/90 pl-14 pr-5 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-[0_7px_20px_rgba(15,23,42,.05)] focus:border-[#7657FF]/55 focus:ring-4 focus:ring-[#7657FF]/10 transition-all"/>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Lock size={21} className="text-[#7657FF]/70 group-focus-within:text-[#7657FF]"/></div>
            <input type="password" required value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} placeholder="Contraseña" className="w-full h-[62px] rounded-[19px] bg-white/88 border border-slate-200/90 pl-14 pr-5 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-[0_7px_20px_rgba(15,23,42,.05)] focus:border-[#7657FF]/55 focus:ring-4 focus:ring-[#7657FF]/10 transition-all"/>
          </div>
          <button type="submit" className="w-full h-[62px] mt-3 rounded-[20px] bg-gradient-to-r from-[#6D4BFF] via-[#A43BFA] to-[#F12BB5] text-white font-black uppercase tracking-[.14em] shadow-[0_16px_34px_rgba(164,59,250,.28)] active:scale-[.975] transition-transform flex items-center justify-center gap-3">Ingresar <Sparkles size={22}/><span className="w-8 h-8 rounded-full bg-white/16 flex items-center justify-center"><ChevronRight size={18}/></span></button>
        </form>
        <div className="mt-7 pt-5 border-t border-slate-200/70 flex items-center justify-center gap-2 text-slate-400"><ShieldCheck size={16} className="text-[#7657FF]/70"/><span className="text-[10px] font-semibold">Acceso seguro y confiable</span></div>
      </div>
    </div>
  );
}
