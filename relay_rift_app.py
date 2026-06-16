import json, math, os, random, re, socket, subprocess, threading, time, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox
VERSION='3.0.0-desktop-alpha'; PORT=8099; W=1100; H=680; ROOT=Path(__file__).resolve().parent
COL={'Guard':'#80f7ff','Striker':'#ff5f7e','Runner':'#80ff9a','Vector':'#ffd166'}
def jb(x): return json.dumps(x,separators=(',',':')).encode()
def clamp(x,a,b): return max(a,min(b,x))
def norm(u):
    u=(u or '').strip();
    return '' if not u else (u if u.startswith(('http://','https://')) else 'http://'+u).rstrip('/').split('?',1)[0]
def ips():
    out=['127.0.0.1']
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); out.append(s.getsockname()[0]); s.close()
    except Exception: pass
    return list(dict.fromkeys(out))
class Core:
    def __init__(s,name='Host',preset='Quick Raid'):
        s.lock=threading.RLock(); s.code=''.join(random.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(5)); s.phase='lobby'; s.msg='Lobby ready'; s.players={}; s.balls=[]; s.blocks=[]; s.hp=6; s.score=0; s.combo=0; s.public=''; s.host=s.join(name,'Guard'); s.reset()
    def join(s,name,role='Guard',bot=False):
        pid=('bot' if bot else 'p')+str(random.randrange(10**9)); y=90+len(s.players)*70
        s.players[pid]={'id':pid,'name':(name or 'Player')[:18],'role':role if role in COL else 'Guard','y':y,'ty':y,'spin':0,'serve':False,'bot':bot,'seen':time.time(),'score':0}; s.msg=f"{name} joined"; return pid
    def bots(s,n=3):
        for i in range(n):
            if len(s.players)<8: s.join('Bot '+str(i+1),random.choice(list(COL)),True)
    def reset(s):
        s.balls=[{'x':110,'y':H/2,'vx':0,'vy':0,'spin':0,'held':True}]; s.blocks=[]
        for r in range(5):
            for c in range(7): s.blocks.append({'x':610+c*45,'y':90+r*48,'kind':random.choice(['brick','brick','brick','heal','split']),'hp':1})
    def start(s):
        s.phase='playing'; s.hp=6; s.score=0; s.combo=0; s.bots(3); s.reset(); s.msg='Run live: click/Space to serve'
    def inp(s,pid,y,spin,serve):
        p=s.players.get(pid);
        if p: p.update(ty=clamp(float(y),0,1)*H,spin=clamp(float(spin),-1,1),serve=bool(serve),seen=time.time())
    def tick(s,dt=.016):
        with s.lock:
            if s.phase!='playing': return
            live=[b for b in s.balls if not b.get('held')]; target=live[0]['y'] if live else H/2
            for p in s.players.values():
                if p['bot']: p['ty']=clamp(target+random.uniform(-40,40),40,H-40); p['spin']=clamp((H/2-p['ty'])/260,-1,1); p['serve']=True
                p['y']+= (p['ty']-p['y'])*min(1,dt*8)
            for b in list(s.balls): s.ball(b,dt)
            if not s.blocks: s.score+=300; s.reset(); s.msg='New wave'
            if s.hp<=0: s.phase='lobby'; s.msg='Run failed. Start again.'
    def ball(s,b,dt):
        if b.get('held'):
            p=next(iter(s.players.values()),None); b['x']=95; b['y']=p['y'] if p else H/2
            if p and p.get('serve'): b.update(held=False,vx=430,vy=p['spin']*220,spin=p['spin']*1.4); p['serve']=False
            return
        b['vy']+=b['spin']*90*dt; b['x']+=b['vx']*dt; b['y']+=b['vy']*dt
        if b['y']<12 or b['y']>H-12: b['y']=clamp(b['y'],12,H-12); b['vy']*=-.95
        if b['vx']<0:
            for p in s.players.values():
                ph={'Guard':130,'Striker':88,'Runner':98,'Vector':108}.get(p['role'],110)
                if abs(b['x']-70)<24 and abs(b['y']-p['y'])<ph/2+10:
                    b['x']=96; b['vx']=abs(b['vx'])*1.035; b['vy']+=(b['y']-p['y'])*3+p['spin']*210; b['spin']=clamp(b['spin']+p['spin']*1.4,-4,4); s.combo+=1; s.score+=8+s.combo; s.msg=f"{p['name']} returned: combo {s.combo}"; break
        for bl in list(s.blocks):
            if abs(b['x']-bl['x'])<22 and abs(b['y']-bl['y'])<18:
                s.blocks.remove(bl); b['vx']*=-1; b['vy']+=random.uniform(-80,80); s.score+=25
                if bl['kind']=='heal': s.hp=min(6,s.hp+1)
                if bl['kind']=='split' and len(s.balls)<4: s.balls.append({'x':b['x'],'y':b['y'],'vx':-b['vx']*.8,'vy':-b['vy']*.7,'spin':-b['spin'],'held':False})
                break
        if b['x']>W-8: s.score+=100; b.update(x=110,y=H/2,vx=0,vy=0,spin=0,held=True)
        if b['x']<4: s.hp-=1; s.combo=0; b.update(x=110,y=H/2,vx=0,vy=0,spin=0,held=True); s.msg='Miss: HP lost'
    def snap(s,bases=[]):
        links=[u.rstrip('/')+'?room='+s.code for u in ([s.public] if s.public else [])+bases]
        return {'ok':1,'version':VERSION,'code':s.code,'phase':s.phase,'hp':s.hp,'score':s.score,'combo':s.combo,'msg':s.msg,'players':list(s.players.values()),'balls':s.balls,'blocks':s.blocks,'links':links,'arena':{'w':W,'h':H}}
class Host:
    def __init__(s,app): s.app=app; s.core=None; s.http=None; s.bases=[]
    def start(s,name):
        if s.http: return
        s.core=Core(name); s.bases=[f'http://{ip}:{PORT}/' for ip in ips()]
        host=s
        class H(BaseHTTPRequestHandler):
            def log_message(self,*a): pass
            def sendj(self,x,code=200): self.send_response(code); self.send_header('content-type','application/json'); self.send_header('access-control-allow-origin','*'); self.end_headers(); self.wfile.write(jb(x))
            def body(self):
                n=int(self.headers.get('content-length','0') or 0); return json.loads(self.rfile.read(n).decode() or '{}') if n else {}
            def do_OPTIONS(self): self.sendj({})
            def do_GET(self):
                p=urllib.parse.urlparse(self.path).path
                if p=='/api/info': self.sendj({k:v for k,v in host.core.snap(host.bases).items() if k in ('ok','version','code','phase','players','links')}); return
                if p=='/api/state': self.sendj(host.core.snap(host.bases)); return
                self.send_response(200); self.send_header('content-type','text/html'); self.end_headers(); self.wfile.write(b'<h1>Relay Rift Desktop Host</h1><p>Open the desktop app and paste this URL.</p>')
            def do_POST(self):
                d=self.body(); p=self.path
                if p=='/api/join': self.sendj({'ok':1,'id':host.core.join(d.get('name','Player'),d.get('role','Guard'))}); return
                if p=='/api/input': host.core.inp(d.get('id',''),d.get('y',.5),d.get('spin',0),d.get('serve',False)); self.sendj({'ok':1}); return
                if p=='/api/start': host.core.start(); self.sendj({'ok':1}); return
                if p=='/api/bots': host.core.bots(int(d.get('count',3))); self.sendj({'ok':1}); return
                if p=='/api/public-url': host.core.public=norm(d.get('url','')); self.sendj({'ok':1}); return
                self.sendj({'ok':0},404)
        s.http=ThreadingHTTPServer(('0.0.0.0',PORT),H); threading.Thread(target=s.http.serve_forever,daemon=True).start(); threading.Thread(target=s.loop,daemon=True).start()
    def loop(s):
        t=time.time()
        while s.http:
            n=time.time(); s.core.tick(min(.05,n-t)); t=n; time.sleep(1/60)
class Client:
    def __init__(s,app): s.app=app; s.url=''; s.id=''; s.run=False
    def req(s,path,d=None,timeout=3):
        if d is None: return json.loads(urllib.request.urlopen(s.url+path,timeout=timeout).read().decode())
        r=urllib.request.Request(s.url+path,data=jb(d),headers={'content-type':'application/json'},method='POST'); return json.loads(urllib.request.urlopen(r,timeout=timeout).read().decode())
    def check(s,url): s.url=norm(url); return s.req('/api/info')
    def join(s,url,name,role): s.url=norm(url); s.id=s.req('/api/join',{'name':name,'role':role})['id']; s.run=True; threading.Thread(target=s.poll,daemon=True).start()
    def poll(s):
        while s.run:
            try: s.app.state=s.req('/api/state')
            except Exception as e: s.app.log('Connection lost: '+str(e)); time.sleep(1)
            time.sleep(.05)
    def inp(s,y,spin,serve):
        if s.id:
            try: s.req('/api/input',{'id':s.id,'y':y,'spin':spin,'serve':serve},1)
            except Exception: pass
class App:
    def __init__(s):
        s.r=tk.Tk(); s.r.title('Relay Rift Desktop '+VERSION); s.r.geometry('1100x720'); s.host=Host(s); s.client=Client(s); s.state={}; s.y=.5; s.spin=0; s.serve=False; s.keys=set(); s.lobbies=[]; s.ui()
        s.r.bind('<KeyPress>',lambda e:(s.keys.add(e.keysym.lower()), setattr(s,'serve',True) if e.keysym.lower()=='space' else None)); s.r.bind('<KeyRelease>',lambda e:s.keys.discard(e.keysym.lower())); s.r.after(33,s.tick)
    def ui(s):
        left=ttk.Frame(s.r,padding=10); left.pack(side='left',fill='y'); s.cv=tk.Canvas(s.r,bg='#050714'); s.cv.pack(side='right',fill='both',expand=True); s.cv.bind('<Motion>',lambda e:setattr(s,'y',e.y/max(1,s.cv.winfo_height()))); s.cv.bind('<Button-1>',lambda e:setattr(s,'serve',True))
        ttk.Label(left,text='Relay Rift Desktop',font=('Segoe UI',16,'bold')).pack(anchor='w'); s.name=tk.StringVar(value=os.environ.get('USERNAME','Player')); s.role=tk.StringVar(value='Guard'); s.url=tk.StringVar()
        ttk.Entry(left,textvariable=s.name).pack(fill='x'); ttk.Combobox(left,textvariable=s.role,values=list(COL),state='readonly').pack(fill='x',pady=2)
        ttk.Button(left,text='Host Local Lobby',command=s.host_local).pack(fill='x',pady=2); ttk.Button(left,text='Host Public Internet Lobby',command=s.host_public).pack(fill='x',pady=2); ttk.Button(left,text='Start Run',command=lambda:s.client.req('/api/start',{})).pack(fill='x',pady=2); ttk.Button(left,text='Add Bots',command=lambda:s.client.req('/api/bots',{'count':3})).pack(fill='x',pady=2)
        ttk.Label(left,text='Lobby URL').pack(anchor='w',pady=(8,0)); ttk.Entry(left,textvariable=s.url,width=38).pack(fill='x'); ttk.Button(left,text='Check URL',command=s.check).pack(fill='x',pady=2); ttk.Button(left,text='Join URL',command=s.join).pack(fill='x',pady=2); ttk.Button(left,text='Scan LAN Lobbies',command=s.scan).pack(fill='x',pady=2)
        s.box=tk.Listbox(left,height=6,width=42); s.box.pack(fill='x'); s.box.bind('<<ListboxSelect>>',lambda e:s.pick()); ttk.Button(left,text='Join Selected',command=s.join_selected).pack(fill='x',pady=2); s.logbox=tk.Text(left,width=42,height=14); s.logbox.pack(fill='both',expand=True)
    def log(s,x): s.logbox.insert('end',x+'\n'); s.logbox.see('end')
    def host_local(s):
        try: s.host.start(s.name.get()); s.client.join(f'http://127.0.0.1:{PORT}',s.name.get(),s.role.get()); [s.log('Invite: '+u) for u in s.host.core.snap(s.host.bases)['links']]; s.url.set(s.host.bases[-1].rstrip('/'))
        except Exception as e: messagebox.showerror('Host failed',str(e))
    def host_public(s):
        s.host_local(); threading.Thread(target=s.tunnel,daemon=True).start()
    def tunnel(s):
        try:
            exe=str(ROOT/'tools'/('cloudflared.exe' if os.name=='nt' else 'cloudflared')); cmd=exe if os.path.exists(exe) else 'cloudflared'; p=subprocess.Popen([cmd,'tunnel','--url',f'http://127.0.0.1:{PORT}'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            for line in p.stdout:
                s.log(line.strip()); m=re.search(r'https://[a-z0-9-]+\.trycloudflare\.com',line,re.I)
                if m: u=m.group(0); s.url.set(u); s.host.core.public=u; s.log('PUBLIC LINK: '+u)
        except Exception as e: s.log('Public tunnel failed: '+str(e)+'; install cloudflared or use LAN.')
    def check(s):
        try: info=s.client.check(s.url.get()); s.log(f"Lobby {info.get('code')} {info.get('phase')} players={len(info.get('players',[]))}")
        except Exception as e: s.log('Check failed: '+str(e))
    def join(s):
        try: s.client.join(s.url.get(),s.name.get(),s.role.get()); s.log('Joined '+norm(s.url.get()))
        except Exception as e: s.log('Join failed: '+str(e))
    def scan(s): threading.Thread(target=s._scan,daemon=True).start()
    def _scan(s):
        s.lobbies=[]; s.log('Scanning LAN...'); bases=[]
        for ip in ips()[1:]: pre='.'.join(ip.split('.')[:3]); bases += [f'http://{pre}.{i}:{PORT}' for i in range(1,255)]
        def probe(u):
            try:
                d=json.loads(urllib.request.urlopen(u+'/api/info',timeout=.2).read().decode()); s.lobbies.append((u,d)) if d.get('ok') else None
            except Exception: pass
        ts=[threading.Thread(target=probe,args=(u,),daemon=True) for u in bases]
        [t.start() for t in ts]; [t.join(.25) for t in ts]; s.r.after(0,s.refresh)
    def refresh(s): s.box.delete(0,'end'); [s.box.insert('end',f"{d.get('code')} {d.get('phase')} {len(d.get('players',[]))}p {u}") for u,d in s.lobbies]; s.log('Found '+str(len(s.lobbies))+' lobby/lobbies')
    def pick(s):
        if s.box.curselection(): s.url.set(s.lobbies[s.box.curselection()[0]][0])
    def join_selected(s): s.pick(); s.join()
    def tick(s):
        s.spin=-1 if ('a' in s.keys or 'left' in s.keys) else 1 if ('d' in s.keys or 'right' in s.keys) else 0; s.client.inp(s.y,s.spin,s.serve); s.serve=False; s.draw(); s.r.after(33,s.tick)
    def draw(s):
        c=s.cv; w=max(1,c.winfo_width()); h=max(1,c.winfo_height()); c.delete('all'); c.create_rectangle(0,0,w,h,fill='#050714',outline=''); c.create_line(w/2,0,w/2,h,fill='#ffd166')
        st=s.state
        if not st: c.create_text(w/2,h/2,text='Host, scan, check, or join lobbies inside the app',fill='white',font=('Segoe UI',16,'bold')); return
        sx=lambda x:x/W*w; sy=lambda y:y/H*h
        for b in st.get('blocks',[]): c.create_rectangle(sx(b['x']-14),sy(b['y']-10),sx(b['x']+14),sy(b['y']+10),fill={'heal':'#80ff9a','split':'#ffd166'}.get(b.get('kind'),'#a98cff'),outline='')
        for p in st.get('players',[]): ph={'Guard':130,'Striker':88,'Runner':98,'Vector':108}.get(p.get('role'),110); c.create_rectangle(sx(62),sy(p['y']-ph/2),sx(78),sy(p['y']+ph/2),fill=COL.get(p.get('role'),'#80f7ff'),outline=''); c.create_text(sx(120),sy(p['y']-ph/2-8),text=('BOT ' if p.get('bot') else '')+p.get('name','P'),fill='white',font=('Segoe UI',9,'bold'))
        for b in st.get('balls',[]): c.create_oval(sx(b['x']-8),sy(b['y']-8),sx(b['x']+8),sy(b['y']+8),fill='white',outline='')
        c.create_text(w/2,24,text=f"{st.get('phase','').upper()} HP {st.get('hp')} SCORE {st.get('score')} COMBO {st.get('combo')}",fill='white',font=('Segoe UI',13,'bold')); c.create_text(w/2,h-24,text=st.get('msg',''),fill='#aab5d8')
    def run(s): s.r.mainloop()
if __name__=='__main__': App().run()
