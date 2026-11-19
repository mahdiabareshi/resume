if (window.IntersectionObserver) document.documentElement.classList.add("js");

const SITE = { owner: "مهدی ابارشی", ownerEn: "Mahdi Abarshi", en: "mahdi dev", accent: "" };
const TELEGRAM = { id: "pahlavi_mahdi", url: "https://t.me/pahlavi_mahdi" };
const GITHUB = { url: "https://github.com/pahlavi_mahdi" };
const EASTER_EGGS = true; /* ⛔ لغو ترمینال و کد کونامی: false */

const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} },
};
const sess = {
  get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} },
};
const mm = (q) => window.matchMedia ? matchMedia(q).matches : false;

const VISITS_KEY = "mehdi-visits-v1";
(function trackVisit(){
  try{
    const today = new Date().toISOString().slice(0,10);
    const v = JSON.parse(store.get(VISITS_KEY) || "{}");
    v[today] = (v[today] || 0) + 1;
    store.set(VISITS_KEY, JSON.stringify(v));
  }catch(e){}
})();
function getVisits(){ try { return JSON.parse(store.get(VISITS_KEY) || "{}"); } catch(e){ return {}; } }

/* ═══ وضعیت همکاری ═══ */
const AVAIL_KEY = "mehdi-avail";
const AVAIL_STATES = {
  "open": {
    kicker: { fa: "آماده همکاری", en: "Available for work" },
    text: { fa: "در حال حاضر آماده‌ی پروژه‌های جدید هستم — اگر ایده‌ای داری، خوشحال می‌شم ازش بشنوم.", en: "I'm currently available for new projects — if you have an idea, I'd love to hear about it." },
  },
  "busy-free": {
    kicker: { fa: "درحال انجام پروژه", en: "Working — available" },
    text: { fa: "درحال انجام یه پروژه هستم، اما وقتِ آزاد برای پروژه‌ی دیگه داریم — بیا صحبت کنیم!", en: "I'm working on a project, but I have capacity for another — let's talk!" },
  },
  "busy": {
    kicker: { fa: "درحال انجام پروژه", en: "Busy — no new work" },
    text: { fa: "درحال انجام یه پروژه هستم و فعلاً ظرفیت جدید ندارم — ولی می‌تونیم برای آینده هماهنگ بشیم.", en: "I'm working on a project and have no new capacity right now — but we can plan for the future." },
  },
};
function applyAvail(v) {
  const st = AVAIL_STATES[v] || AVAIL_STATES["open"];
  document.body.dataset.avail = AVAIL_STATES[v] ? v : "open";
  const k = document.getElementById("avKicker");
  const tx = document.getElementById("avText");
  const kicker = L(st.kicker);
  if (k) k.textContent = kicker;
  if (tx) tx.textContent = L(st.text);
  /* همگام‌سازی نشانگر وضعیتِ نقطه‌ای هیرو + فوتر */
  const hs = document.getElementById("heroStatus");
  if (hs) hs.setAttribute("data-st-text", kicker);
  const fStTxt = document.getElementById("fStatusTxt");
  if (fStTxt) fStTxt.textContent = kicker;
}
/* applyAvail بعداً صدا زده می‌شه تا LANG و L تعریف شده باشن */

/* ═══ PWA: ثبت Service Worker + مدیریت دکمه‌ی نصب ═══ */
(function setupPWA() {
  const SW_CODE = `
    const CACHE_NAME = 'mehdi-resume-v2';
    const ASSETS = ['./', './index.html'];
    self.addEventListener('install', (e) => {
      self.skipWaiting();
      e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS).catch(() => {})));
    });
    self.addEventListener('activate', (e) => {
      e.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ).then(() => self.clients.claim()));
    });
    self.addEventListener('fetch', (e) => {
      if (e.request.method !== 'GET') return;
      const url = new URL(e.request.url);
      if (url.origin !== self.location.origin) return;
      e.respondWith(
        caches.match(e.request).then((cached) => {
          const fetcher = fetch(e.request).then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
            }
            return res;
          }).catch(() => cached);
          return cached || fetcher;
        })
      );
    });
  `;
  /* ثبت SW با Blob URL (برای حالتی که فایل sw.js جداگانه نداریم) */
  if ('serviceWorker' in navigator) {
    try {
      const blob = new Blob([SW_CODE], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      navigator.serviceWorker.register(swUrl, { scope: './' })
        .then(() => console.log('[PWA] SW registered'))
        .catch((err) => console.warn('[PWA] SW registration failed:', err.message));
    } catch(e) { console.warn('[PWA] SW setup failed:', e.message); }
  }
  /* مدیریت دکمه‌ی نصب (beforeinstallprompt) */
  let deferredPrompt = null;
  const pwaBtn = document.getElementById('pwaInstall');
  const pwaDismiss = document.getElementById('pwaDismiss');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBtn) {
      pwaBtn.hidden = false;
      pwaBtn.classList.add('show');
    }
  });
  if (pwaBtn) pwaBtn.addEventListener('click', (e) => {
    if (e.target === pwaDismiss || e.target.closest('#pwaDismiss')) {
      pwaBtn.classList.remove('show');
      pwaBtn.hidden = true;
      store.set('mehdi-pwa-dismissed', '1');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          toast('اپ نصب شد ✅', 'ok');
        }
        deferredPrompt = null;
        pwaBtn.classList.remove('show');
        pwaBtn.hidden = true;
      });
    }
  });
  /* اگر قبلاً نصب شده، دکمه رو نشون نده */
  window.addEventListener('appinstalled', () => {
    if (pwaBtn) { pwaBtn.classList.remove('show'); pwaBtn.hidden = true; }
    toast('اپ با موفقیت نصب شد 🎉', 'ok');
  });
  /* اگه از قبل توی حالت standalone اجرا می‌شه، دکمه رو نشون نده */
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    if (pwaBtn) pwaBtn.hidden = true;
  }
})();

let LANG = store.get("mehdi-lang") || "fa"; /* زبان پیش‌فرض: فارسی (سایت فارسی‌محور است) */
let skillsExpanded = false;
const L = (o) => (o && typeof o === "object") ? (o[LANG] ?? o.fa) : o;
/* حالا که L تعریف شد، applyAvail رو صدا بزن */
applyAvail(store.get(AVAIL_KEY) || "open");

const TITLES = { fa:"مهدی ابارشی | توسعه‌دهنده فرانت‌اند و بک‌اند", en:"Mahdi Abarshi | Full-Stack Developer" };
const EN = {
  "nav.home":"Home","nav.skills":"Skills","nav.projects":"Projects","nav.about":"About me","nav.contact":"Contact me",
  "brush":"Customize look","ver":'Built with <i class="fa-solid fa-heart"></i> & lots of code',
  "kicker":"Welcome to my code world","h1a":"I'm","h1b":"",
  "lead":'Here I build <b>real web projects</b> — from modern UIs to servers & APIs.',
  "s.skills.tag":"// Skills","s.skills.h":"What can I do?","s.skills.sub":"Hover (or tap) a skill to see what I can build with it.",
  "s.proj.tag":"// Portfolio","s.proj.h":"My Projects","s.proj.sub":"Every project comes with a live demo, source code and an intro video.",
  "s.about.tag":"// About me","s.about.h":"Meet Mahdi Abarshi","s.about.sub":"My journey from zero to today 👇",
  "s.val.h":"My Values","s.val.sub":"What matters to me in my craft 👇",
  "c.age":"years old","c.exp":"+ years of coding","c.edu":"High school · In progress","c.fe":"Frontend","c.be":"Backend",
  "av.h":"Availability","av.btn":"Let's talk",
  "c.h":"Contact me","c.sub":"Got a project in mind or want to talk about an opportunity? I'd love to hear from you — I usually reply fast.","c.phone":"Phone","c.email":"Email","c.tg":"Telegram","c.tgval":"The fastest way to reach me","c.copy":"Copy ID","c.open":"Open Telegram","copy":"Copy",
  "foot.pre":"©","foot.post":"— All rights reserved.","foot.tag":"Frontend & backend developer — building real things with code.","foot.exp":"Sections","foot.res":"Resources","foot.contact":"Contact","foot.top":"Back to top","foot.built":"Built with","foot.built2":"& lots of code","foot.loc":"Iran",
  "st.open":"Available for work","st.busy-free":"Working — available","st.busy":"Busy — no new work",
  "soc.gh":"GitHub","soc.tg":"Telegram","soc.ig":"Instagram","soc.yt":"YouTube",
        "term.tip":"Need help? I'm here!","sp.fs":"Text size","sp.t":"Customize 🎨","sp.mode":"Display mode","sp.dark":"Dark","sp.light":"Light","sp.color":"Accent color","sp.lang":"Language / زبان","sp.pdf":"Download Resume (PDF)",
  "adm.dash":"Dashboard","adm.timeline":"Timeline","adm.stats":"Analytics","adm.users":"Users","adm.look":"Site Appearance","adm.avail":"Availability","adm.settings":"Settings",
  "adm.backup":"Backup","adm.backupDesc":"Export your data as JSON or restore from a file.","adm.export":"Export JSON","adm.import":"Restore from file","adm.reset":"Full reset",
  "adm.mngProj":"Manage Projects","adm.newProj":"New Project","adm.mngSkill":"Manage Skills","adm.newSkill":"New Skill","adm.mngTl":"Manage Timeline","adm.newStep":"New Step",
  "adm.regUsers":"Registered Users","adm.heroImg":"Site Appearance","adm.hterm":"Hero Terminal","adm.saveAvail":"Save Status","adm.saveSettings":"Save Settings",
  "adm.loginTitle":"Admin Login","adm.loginSub":"Login only with the admin password — it is never stored in the code","adm.loginBtn":"Enter Panel",
  "adm.title":"Admin Panel","adm.sub":"Mahdi Abarshi — simulation version","adm.view":"View Site","adm.logout":"Logout","adm.save":"Save","adm.submit":"Submit","adm.cancel":"Cancel","adm.chartTitle":"Last 14 days",
  "m.cat":"Category:","m.year":"Year:","m.soon":"Coming soon","sf.newtab":"New tab",
  "more":"Show more","less":"Show less",
  "adm.f.contact":"Contact details","adm.f.social":"Social links","adm.f.texts":"Hero texts",
  "adm.f.soonNote":"Leave a field empty and clicking its link on the site shows a “coming soon” message instead.",
  "adm.f.phone":"Phone number","adm.f.email":"Email address",
  "adm.f.tg":"Telegram — ID (without @)","adm.f.gh":"GitHub — username or link",
  "adm.f.ig":"Instagram — username or link (empty = coming soon)","adm.f.yt":"YouTube — @handle or link (empty = coming soon)",
  "adm.f.leadFa":"Hero sentence — Persian","adm.f.leadEn":"Hero sentence — English",
};
const T = {
  fa:{copied:"آیدی تلگرام کپی شد ✅",copyFail:"کپی نشد! آیدی: ",projSoon:"این پروژه به زودی منتشر می‌شود 🚀",empty:"پروژه‌ای در این دسته نیست — به زودی اضافه می‌شود 🚀",tagSoon:"به زودی",live:"دموی زنده",view:"مشاهده‌ی سایت",demo:"دمو آنلاین",src:"سورس‌کد",video:"ویدیوی معرفی",notPub:"هنوز منتشر نشده",pdfHint:"توی پنجره‌ی چاپ، مقصد رو Save as PDF انتخاب کن 🖨️",langSet:"زبان سایت عوض شد 🌐",
    more:"نمایش بیشتر",less:"نمایش کمتر",
    showPw:"نمایش رمز",hidePw:"پنهان",
    termHelp:"سلام! من ترمینال تعاملی رزومه‌ی مهدی هستم 👋\n\nاینجا می‌تونی با سایت صحبت کنی: مهارت‌ها رو ببینی، پروژه‌ها رو لیست کنی، دموی کافه رو باز کنی و حتی تم و رنگ سایت رو از همین‌جا عوض کنی!\n\nدستورها:\n  help ............. همین راهنما\n  about ............ مهدی کیه؟\n  skills ........... لیست مهارت‌ها\n  projects ......... لیست پروژه‌ها\n  open trisa ....... باز کردن دموی کافه!\n  whoami ........... تو کی هستی؟\n  neofetch ......... مشخصات سیستم\n  theme dark|light . تغییر تم\n  color 1-7 ........ تغییر رنگ سایت\n  contact .......... تلگرام و گیت‌هاب\n  clear ............ پاک کردن صفحه\n  sudo hire-me ..... ??? (امتحان کن!)\n  exit ............. بستن ترمینال",
    termAbout:"مهدی ابارشی، ۱۶ ساله، توسعه‌دهنده فول‌استک — عاشق ساخت چیزهای واقعی با کد ☕",
    termUnknown:(c)=>`دستور ناشناخته: ${c} — برای راهنما help رو بزن`,
    termTheme:(m)=>m==="light"?"حالت روشن فعال شد ☀️":"حالت تیره فعال شد 🌙",
    termColor:(n)=>`رنگ ${n} فعال شد 🎨`,termHire:"دسترسی کامل داده شد! رزومه رو همین‌جا ببین 😎",
    termBye:"خب، خدانگهدار 👋",termClear:"صفحه پاک شد ✨",
    termOpenMiss:"پروژه پیدا نشد — امتحان کن: open trisa",termOpening:(x)=>`در حال باز کردن ${x} ...`},
  en:{copied:"Telegram ID copied ✅",copyFail:"Copy failed! ID: ",projSoon:"This project will be published soon 🚀",empty:"No projects in this category yet — coming soon 🚀",tagSoon:"Soon",live:"Live demo",view:"View site",demo:"Live Demo",src:"Source",video:"Intro Video",notPub:"Not published yet",pdfHint:"In the print window choose Save as PDF 🖨️",langSet:"Language switched 🌐",
    more:"Show more",less:"Show less",
    showPw:"Show password",hidePw:"Hide",
    termHelp:"Hi! I'm the interactive terminal of Mehdi's resume 👋\n\nHere you can talk to the site: list skills, browse projects, open the café demo and even switch theme & colors!\n\nCommands:\n  help ............. this guide\n  about ............ who is Mehdi\n  skills ........... list skills\n  projects ......... list projects\n  open trisa ....... open the cafe demo!\n  whoami ........... who are you?\n  neofetch ......... system info\n  theme dark|light . switch theme\n  color 1-7 ........ accent color\n  contact .......... telegram & github\n  clear ............ clear screen\n  sudo hire-me ..... ??? (try it!)\n  exit ............. close terminal",
    termAbout:"Mahdi Abarshi, 16, full-stack developer — loves building real things with code ☕",
    termUnknown:(c)=>`Unknown command: ${c} — type help`,
    termTheme:(m)=>m==="light"?"Light mode on ☀️":"Dark mode on 🌙",
    termColor:(n)=>`Color ${n} set 🎨`,termHire:"ACCESS GRANTED — check my resume here 😎",
    termBye:"Okay, bye 👋",termClear:"Screen cleared ✨",
    termOpenMiss:"Project not found — try: open trisa",termOpening:(x)=>`Opening ${x} ...`},
};
const t = (k) => T[LANG][k];

const TYPER_LINES = [
  {fa:"توسعه‌دهنده فرانت‌اند 💻",en:"Frontend Developer 💻"},
  {fa:"توسعه‌دهنده بک‌اند ⚙️",en:"Backend Developer ⚙️"},
  {fa:"عاشق ساختن چیزهای جدید 🚀",en:"I love building new things 🚀"},
];
const CAT_LABEL = {
  fa:{fe:"فرانت‌اند",be:"بک‌اند",tl:"ابزارها",web:"فرانت‌اند و بک‌اند",py:"پایتون"},
  en:{fe:"Frontend",be:"Backend",tl:"Tools",web:"Frontend & Backend",py:"Python"},
};
const SKILLS = [
  {name:{fa:"HTML، CSS، JavaScript",en:"HTML, CSS, JS"},en:"HTML, CSS, JS",icon:"fa-brands fa-js",c:"#ffd60a",cat:"fe",tip:{fa:"از ساخت صفحات ریسپانسیو با Flex و Grid تا منطق کامل سمت کلاینت: DOM، رویدادها، Fetch و API — دقیقاً مثل همین سایت.",en:"From responsive pages with Flex & Grid to full client-side logic: DOM, events, Fetch & APIs — just like this site."}},
  {name:{fa:"React",en:"React"},en:"React",icon:"fa-brands fa-react",c:"#61dafb",cat:"fe",tip:{fa:"کامپوننت‌های قابل‌استفاده‌ی مجدد، Hooks و اپلیکیشن‌های تک‌صفحه‌ای.",en:"Reusable components, Hooks and single-page apps."}},
  {name:{fa:"Node.js",en:"Node.js"},en:"Node.js",icon:"fa-brands fa-node-js",c:"#68a063",cat:"be",tip:{fa:"سرور و API با Express، دیتابیس و احراز هویت.",en:"Servers & APIs with Express, databases and auth."}},
  {name:{fa:"Python",en:"Python"},en:"Python",icon:"fa-brands fa-python",c:"#4b8bbe",cat:"be",tip:{fa:"اسکریپت‌نویسی، اتوماسیون و ساخت ربات.",en:"Scripting, automation and bots."}},
  {name:{fa:"Git و GitHub",en:"Git & GitHub"},en:"Git & GitHub",icon:"fa-brands fa-git-alt",c:"#f05033",cat:"tl",tip:{fa:"مدیریت نسخه‌ها و انتشار پروژه‌ها.",en:"Version control and publishing."}},
  {name:{fa:"SQL و دیتابیس",en:"SQL & Databases"},en:"SQL & Databases",icon:"fa-solid fa-database",c:"#3ddc97",cat:"be",tip:{fa:"طراحی جداول، کوئری‌نویسی و اتصال دیتابیس.",en:"Schema design, queries and DB wiring."}},
];
const TIMELINE = [
  {when:{fa:"۱۴۰۲",en:"2023"},icon:"fa-solid fa-seedling",h:{fa:"شروع ماجراجویی با کد",en:"The journey begins"},p:{fa:"اولین آشنایی با HTML و CSS — از همون لحظه فهمیدم این مسیر منه.",en:"First meeting with HTML & CSS — I knew right away this was my path."}},
  {when:{fa:"۱۴۰۳",en:"2024"},icon:"fa-solid fa-mug-hot",h:{fa:"ساخت کافه تریسا",en:"Building Trisa Café"},p:{fa:"کامل‌ترین پروژه‌ی فرانت‌اند من — منو، سبد خرید و رزرو میز با ده‌ها افکت.",en:"My most complete frontend project — menu, cart and reservations with dozens of effects."}},
  {when:{fa:"۱۴۰۴",en:"2025"},icon:"fa-solid fa-id-card",h:{fa:"ساخت رزومه‌ی آنلاین",en:"Building this resume"},p:{fa:"همین سایتی که توش هستی — با ترمینال تعاملی و دوزبانه!",en:"The site you're on — with an interactive terminal and bilingual UI!"}},
  {when:{fa:"الان",en:"Now"},icon:"fa-solid fa-rocket",h:{fa:"مسیر فول‌استک",en:"The full-stack path"},p:{fa:"یادگیری عمیق جاوااسکریپت؛ بعدش React و Node.js — و بازسازی پروژه‌ها از صفر.",en:"Deep-diving JavaScript; next React and Node.js — and rebuilding projects from scratch."}},
];
const VALUES = [
  {icon:"fa-solid fa-code", c:"#45b9ff", t:{fa:"کیفیت کد و قابلیت نگهداری",en:"Code Quality & Maintainability"}, p:{fa:"نوشتن کدی که نگه‌داری‌اش بدون درد باشه و با اطمینان روش گسترش بدی.",en:"Writing code that is painless to maintain and safe to extend."}},
  {icon:"fa-solid fa-arrow-trend-up", c:"#3ddc97", t:{fa:"عملکرد و مقیاس‌پذیری",en:"Performance & Scalability"}, p:{fa:"ساختن سیستم‌هایی که زیر فشار هم سریع می‌مونن و با رشد نیاز، مقیاس می‌گیرن.",en:"Building systems that stay fast under load and scale as needs grow."}},
  {icon:"fa-solid fa-layer-group", c:"#8b7cff", t:{fa:"معماری تمیز",en:"Clean Architecture"}, p:{fa:"طراحی سیستم‌ها با مرزهای مشخص و مسئولیت‌های واحد.",en:"Designing systems with clear boundaries and single responsibilities."}},
  {icon:"fa-solid fa-people-group", c:"#ff9f43", t:{fa:"تجربه‌ی توسعه‌دهنده",en:"Developer Experience"}, p:{fa:"ابزارها و گردش‌کارهایی که تیم رو پرتوان‌تر می‌کنه.",en:"Tools and workflows that make teams more productive."}},
  {icon:"fa-solid fa-language", c:"#2dd4bf", t:{fa:"زبان انگلیسی",en:"English Language"}, p:{fa:"در حال یادگیری و تمرین — می‌تونم مستندات و منابع فنی رو بخونم و یاد بگیرم.",en:"Actively learning — I can read technical docs and learn from them."}},
  {icon:"fa-regular fa-lightbulb", c:"#ffd60a", t:{fa:"تفکر محصول",en:"Product Thinking"}, p:{fa:"درک نیازهای کاربر و ترجمه‌ی اون‌ها به راه‌حل‌های فنی.",en:"Understanding user needs and translating them into technical solutions."}},
];
const FILTERS = [
  {key:"all",label:{fa:"همه",en:"All"},en:"All",icon:"fa-solid fa-layer-group"},
  {key:"web",label:{fa:"فرانت‌اند و بک‌اند",en:"Frontend & Backend"},en:"Web",icon:"fa-solid fa-display"},
  {key:"py",label:{fa:"پایتون",en:"Python"},en:"Python",icon:"fa-brands fa-python"},
];
const PROJECTS = [
  {title:{fa:"کافه تریسا",en:"Trisa Café"},short:{fa:"سایت کامل کافه — منو، سبد خرید، رزرو میز",en:"Full café site — menu, cart, reservation"},cat:"web",cats:["HTML","CSS","JavaScript"],year:"۱۴۰۴",icon:"fa-solid fa-mug-hot",g1:"#8f7fe8",g2:"#332b63",desc:{fa:"وب‌سایت کامل کافه تریسا با منوی تعاملی، سبد خرید، رزرو میز و ده‌ها افکت انیمیشنی SVG — یک پروژه‌ی فرانت‌اند واقعی و کامل.",en:"A complete café website: interactive menu, cart, reservations and dozens of SVG effects — a real full frontend project."},links:{source:"gh"},embed:"project/trisa.html",soon:false},
  {title:{fa:"بوتیک آنلاین شاپ",en:"Online Shop Boutique"},short:{fa:"فروشگاه آنلاین بوتیک — ویترین محصولات، سبد خرید و ثبت سفارش",en:"Boutique online shop — products, cart & ordering"},cat:"web",cats:["HTML","CSS","JavaScript"],year:"۱۴۰۴",icon:"fa-solid fa-bag-shopping",g1:"#ff6b9d",g2:"#2a0e1c",desc:{fa:"فروشگاه آنلاین بوتیک با ویترین محصولات، سبد خرید تعاملی و ثبت سفارش — طراحی مدرن و کاملاً واکنش‌گرا.",en:"An online boutique shop with product showcase, interactive cart and order flow — modern, fully responsive design."},links:{source:"gh"},embed:"",soon:false},
  {title:{fa:"آهن‌پیچ",en:"Ahan Pich"},short:{fa:"وب‌سایت فروشگاه ابزار و یراق‌آلات — معرفی محصولات و خدمات",en:"Hardware store website — products & services"},cat:"web",cats:["HTML","CSS","JavaScript"],year:"۱۴۰۴",icon:"fa-solid fa-screwdriver-wrench",g1:"#ff9f43",g2:"#3a2409",desc:{fa:"وب‌سایت فروشگاه آهن‌پیچ با معرفی محصولات، خدمات و راه‌های ارتباطی — سبک صنعتی، منظم و واکنش‌گرا.",en:"Ahan Pich hardware store website with products, services and contact — clean, organized and responsive."},links:{source:"gh"},embed:"",soon:false},
];

/* ═══ CMS data + state ═══ */
const CMS_KEY = "mehdi-cms-v2"; /* v2 — تغییر کرد تا داده‌های قدیمی نادیده گرفته بشن */
const CMS_VERSION = 2;
let cmsData = { projects:null, skills:null, timeline:null, texts:{} };
try {
  const raw = store.get(CMS_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    if (d && typeof d === "object" && d._v === CMS_VERSION) {
      cmsData = Object.assign(cmsData, d);
    } else {
      /* نسخه‌ی قدیمی — داده‌ها رو پاک کن */
      store.del(CMS_KEY);
    }
  }
} catch(e){ store.del(CMS_KEY); }
if (!cmsData.texts) cmsData.texts = {};
function cmsSave(){ cmsData._at = Date.now(); cmsData._v = CMS_VERSION; try { store.set(CMS_KEY, JSON.stringify(cmsData)); } catch(e){} }
const state = {
  get projects(){ return Array.isArray(cmsData.projects) ? cmsData.projects : PROJECTS; },
  get skills(){ return Array.isArray(cmsData.skills) ? cmsData.skills : SKILLS; },
  get timeline(){ return Array.isArray(cmsData.timeline) ? cmsData.timeline : TIMELINE; },
  get texts(){ return cmsData.texts || {}; },
};
const tgIdNow = () => {
  const s = (state.texts && state.texts.socials) || {};
  return (typeof s.telegram === "string" && s.telegram.trim()) ? s.telegram.trim().replace(/^@/, "") : (state.texts.tgId || TELEGRAM.id);
};

/* ═══ بک‌اند PHP (اختیاری) — اگر api.php کنار سایت باشد محتوا از سرور لود/ذخیره می‌شود؛ وگرنه همه‌چیز با localStorage کار می‌کند ═══ */
const API = { online: false, authed: false };
async function apiCall(qs, opts) {
  opts = opts || {};
  /* هدر محافظتی CSRF برای درخواست‌های تغییردهنده */
  const h = Object.assign({ "X-Requested-With": "fetch" }, opts.headers || {});
  const r = await fetch("api.php" + qs, Object.assign({ cache: "no-store" }, opts, { headers: h }));
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}
async function apiBoot() {
  try {
    const { status, j } = await apiCall("?action=ping");
    if (status !== 200 || !j || !j.ok) return;
    API.online = true;
    const { j: ld } = await apiCall("?action=load");
    const d = ld && ld.ok ? ld.data : null;
    if (d) {
      if (Array.isArray(d.projects)) cmsData.projects = d.projects;
      if (Array.isArray(d.skills)) cmsData.skills = d.skills;
      if (Array.isArray(d.timeline)) cmsData.timeline = d.timeline;
      if (d.texts && typeof d.texts === "object") cmsData.texts = Object.assign({}, cmsData.texts, d.texts);
      cmsSave();
      if (typeof d.avail === "string" && AVAIL_STATES[d.avail]) store.set(AVAIL_KEY, d.avail);
      if (typeof d.siteName === "string" && d.siteName) { SITE.en = d.siteName; store.set(SITENAME_KEY, d.siteName); }
      if (Number.isFinite(+d.accent) && ACCENTS[+d.accent]) store.set("mehdi-accent", String(+d.accent));
      /* رندر مجدد همه‌چیز با داده‌های سرور */
      setAccent(parseInt(store.get("mehdi-accent") ?? "0", 10) || 0, false);
      applyDynamicTexts(); renderSkills(); renderProjects(); renderTimeline(); renderValues();
      renderContact(); renderSocialLinks(); applyAvail(store.get(AVAIL_KEY) || "open"); applyLang();
      if (typeof htFillForm === "function") htFillForm();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    fetch("api.php?action=track", { method: "POST", headers: { "X-Requested-With": "fetch" } }).catch(() => {});
  } catch (e) { /* آفلاین — localStorage */ }
}
async function syncServer() {
  if (!API.online) return;
  try {
    const body = JSON.stringify({
      projects: cmsData.projects ?? null, skills: cmsData.skills ?? null, timeline: cmsData.timeline ?? null,
      texts: cmsData.texts || {},
      avail: store.get(AVAIL_KEY) || "open",
      accent: parseInt(store.get("mehdi-accent") ?? "0", 10) || 0,
      siteName: SITE.en,
    });
    const { status } = await apiCall("?action=save", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (status === 401) toast("نشست ادمین منقضی شده — دوباره وارد شو ⚠️", "warn");
  } catch (e) {}
}

/* ═══ شبکه‌های اجتماعی + اطلاعات تماس — همه از پنل ادمین قابل تنظیم ═══ */
const SOC_DEFAULTS = {
  telegram: TELEGRAM.id || "",
  github: (GITHUB.url || "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, ""),
  instagram: "", youtube: "",
};
const SOC_LABEL = {
  telegram: { fa: "تلگرام", en: "Telegram" }, github: { fa: "گیت‌هاب", en: "GitHub" },
  instagram: { fa: "اینستاگرام", en: "Instagram" }, youtube: { fa: "یوتیوب", en: "YouTube" },
};
function getSocials() { return Object.assign({}, SOC_DEFAULTS, (state.texts && state.texts.socials) || {}); }
function socUrl(key, raw) {
  raw = String(raw == null ? "" : raw).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const h = raw.replace(/^@/, "").replace(/\/+$/, "");
  if (key === "telegram") return "https://t.me/" + h;
  if (key === "github") return "https://github.com/" + h;
  if (key === "instagram") return "https://instagram.com/" + h;
  if (key === "youtube") return "https://www.youtube.com/@" + h;
  return raw;
}
function renderSocialLinks() {
  const s = getSocials();
  document.querySelectorAll("a[data-soc]").forEach((a) => {
    const u = socUrl(a.dataset.soc, s[a.dataset.soc]);
    if (u) { a.href = u; a.target = "_blank"; a.setAttribute("rel", "noopener"); }
    else { a.href = "#"; a.removeAttribute("target"); }
  });
  const tgTxt = document.querySelector('[data-cv="tg"]');
  if (tgTxt) tgTxt.textContent = s.telegram ? "@" + String(s.telegram).replace(/^@/, "") : (LANG === "en" ? "coming soon" : "به زودی");
}
function renderContact() {
  const c = (state.texts && state.texts.contact) || {};
  const phone = (typeof c.phone === "string" && c.phone.trim()) ? c.phone.trim() : "+98 991 964 6702";
  const email = (typeof c.email === "string" && c.email.trim()) ? c.email.trim() : "abareshimahdi662@gmail.com";
  document.querySelectorAll('[data-contact="phone"]').forEach((a) => { a.href = "tel:" + phone.replace(/[^\d+]/g, ""); });
  document.querySelectorAll('[data-contact="email"]').forEach((a) => { a.href = "mailto:" + email; });
  document.querySelectorAll('[data-cv="phone"]').forEach((el) => { el.textContent = phone; });
  document.querySelectorAll('[data-cv="email"]').forEach((el) => { el.textContent = email; });
}
document.querySelectorAll("a[data-soc]").forEach((a) =>
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") {
      e.preventDefault();
      const lb = SOC_LABEL[a.dataset.soc] || { fa: "", en: "" };
      toast(LANG === "en" ? lb.en + " isn't set up yet — coming soon ✨" : "لینک " + lb.fa + " هنوز ست نشده — به زودی ✨", "info");
    }
  }));
renderSocialLinks(); renderContact();

function toast(msg, type = "info") {
  const wrap = document.getElementById("toasts");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = "toast " + type;
  const icons = { ok:"fa-solid fa-circle-check", info:"fa-solid fa-circle-info", warn:"fa-solid fa-triangle-exclamation" };
  el.innerHTML = `<i class="${icons[type]}"></i><span>${msg}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 320); }, 3600);
}
const faNum = (n) => LANG === "fa" ? Number(n).toLocaleString("fa-IR") : String(n);
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ═══ ترمینال هیرو — کارت JSON معرفی ═══ */
const DEFAULT_TERM = {
  title: "GET /developer/mahdi-abarshi",
  path: "/developer/mahdi-abarshi",
  name: "Mahdi Abarshi",
  role: "Full-Stack Developer",
  age: 16,
  country: "Iran",
  city: "Sabzevar",
  stack: ["HTML", "CSS", "JavaScript", "Node.js", "Python"],
  status: "open_to_work",
  projects: ["Trisa Café", "Online Shop Boutique", "Ahan Pich"],
};
function getTermData() {
  const t = (state.texts && state.texts.term) || {};
  const pick = (v, d) => (v === undefined || v === null || v === "") ? d : v;
  return {
    title: pick(t.title, DEFAULT_TERM.title),
    path: pick(t.path, DEFAULT_TERM.path),
    name: pick(t.name, DEFAULT_TERM.name),
    role: pick(t.role, DEFAULT_TERM.role),
    age: pick(t.age, DEFAULT_TERM.age),
    country: pick(t.country, DEFAULT_TERM.country),
    city: pick(t.city, DEFAULT_TERM.city),
    stack: Array.isArray(t.stack) && t.stack.length ? t.stack : DEFAULT_TERM.stack,
    status: pick(t.status, DEFAULT_TERM.status),
    projects: Array.isArray(t.projects) && t.projects.length ? t.projects : DEFAULT_TERM.projects,
  };
}
function renderHeroTerm(bodyEl, titleEl, data) {
  if (titleEl) titleEl.textContent = data.title || ("GET " + data.path);
  if (!bodyEl) return;
  const s = (v) => `<span class="c-s">"${esc(String(v))}"</span>`;
  const key = (v) => `<span class="c-k">"${esc(String(v))}"</span>`;
  const p = (v) => `<span class="c-p">${v}</span>`;
  let h = "";
  h += `<div class="ht-line"><span class="c-g">$</span> <span class="c-cmd">curl</span> <span class="c-g">GET</span> <span class="c-path">${esc(data.path)}</span></div>`;
  h += `<div class="ht-line"><span class="c-g">HTTP/1.1 200 OK</span></div>`;
  h += `<div class="ht-line">${p("{")}</div>`;
  const members = [
    `${key("name")}${p(": ")}${s(data.name)}`,
    `${key("age")}${p(": ")}<span class="c-n">${esc(String(data.age))}</span>`,
    `${key("role")}${p(": ")}${s(data.role)}`,
    `${key("country")}${p(": ")}${s(data.country)}`,
    `${key("city")}${p(": ")}${s(data.city)}`,
    `${key("stack")}${p(": [")} ${(data.stack || []).map(s).join(p(", "))} ${p("]")}`,
  ].map((m) => `<div class="ht-line wrap">  ${m},</div>`).join("");
  h += members;
  h += `<div class="ht-line">  ${key("status")}${p(": ")}<span class="ht-st"><span class="c-s">"${esc(String(data.status))}"</span></span>,</div>`;
  const pr = data.projects || [];
  h += `<div class="ht-line">  ${key("projects")}${p(": [")}</div>`;
  pr.forEach((item, i) => {
    h += `<div class="ht-line">    ${s(item)}${i < pr.length - 1 ? p(",") : ""}</div>`;
  });
  h += `<div class="ht-line">  ${p("]")}</div>`;
  h += `<div class="ht-line">${p("}")}<span class="ht-caret"></span></div>`;
  bodyEl.innerHTML = h;
}
function initHeroTerm() {
  renderHeroTerm(document.getElementById("htBody"), document.getElementById("htTitleBar"), getTermData());
  const htCopy = document.getElementById("htCopy");
  if (htCopy) htCopy.addEventListener("click", async (e) => {
    e.stopPropagation();
    const d = getTermData();
    const ageNum = parseFloat(String(d.age).replace(/[^\d.]/g, ""));
    const obj = { name: d.name, age: isNaN(ageNum) ? d.age : ageNum, role: d.role, country: d.country, city: d.city, stack: d.stack, status: d.status, projects: d.projects };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      toast(LANG === "en" ? "Terminal JSON copied ✅" : "JSON ترمینال کپی شد ✅", "ok");
    } catch (err) {
      toast(LANG === "en" ? "Copy failed — clipboard blocked" : "کپی نشد — کلیپ‌بورد در دسترس نیست", "warn");
    }
  });
}
/* انیمیشن ورود ترمینال هیرو: تایپ خط curl + ظاهر شدن پلکانی بقیه خط‌ها */
function playHeroTermIntro() {
  const bodyEl = document.getElementById("htBody");
  if (!bodyEl || mm("(prefers-reduced-motion: reduce)")) return;
  const lines = Array.from(bodyEl.querySelectorAll(".ht-line"));
  if (lines.length < 3) return;
  const failOpen = () => bodyEl.querySelectorAll(".ht-hide").forEach((l) => l.classList.remove("ht-hide"));
  try {
    lines.slice(1).forEach((l) => l.classList.add("ht-hide"));
    const first = lines[0];
    const full = first.innerHTML;
    const plain = first.textContent.replace(/^\$\s*/, "");
    first.innerHTML = `<span class="c-g">$</span> <span class="ht-type"></span><span class="ht-caret"></span>`;
    const typeEl = first.querySelector(".ht-type");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (typeEl) typeEl.textContent = plain.slice(0, i);
      if (i >= plain.length) {
        clearInterval(iv);
        first.innerHTML = full;
        lines.slice(1).forEach((l, k) => setTimeout(() => l.classList.remove("ht-hide"), k * 75));
      }
    }, 26);
    setTimeout(() => { clearInterval(iv); failOpen(); }, 6000); /* ضمانت: حتی اگه چیزی خطا داد، ترمینال کامل نمایش داده بشه */
  } catch (err) { failOpen(); }
}
/* ═══ پنل ادمین — ویرایش ترمینال هیرو ═══ */
function htReadForm() {
  const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  const stackArr = v("htFStack").split(/[,،]/).map((x) => x.trim()).filter(Boolean);
  const projArr = v("htFProjects").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  return {
    title: v("htFTitle") || DEFAULT_TERM.title,
    path: v("htFPath") || DEFAULT_TERM.path,
    name: v("htFName") || DEFAULT_TERM.name,
    role: v("htFRole") || DEFAULT_TERM.role,
    age: v("htFAge") || DEFAULT_TERM.age,
    country: v("htFCountry") || DEFAULT_TERM.country,
    city: v("htFCity") || DEFAULT_TERM.city,
    stack: stackArr.length ? stackArr : DEFAULT_TERM.stack,
    status: v("htFStatus") || DEFAULT_TERM.status,
    projects: projArr.length ? projArr : DEFAULT_TERM.projects,
  };
}
function htFillForm() {
  const d = getTermData();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set("htFTitle", d.title); set("htFPath", d.path); set("htFName", d.name); set("htFRole", d.role);
  set("htFAge", String(d.age)); set("htFStatus", d.status); set("htFCountry", d.country); set("htFCity", d.city);
  set("htFStack", (d.stack || []).join(", ")); set("htFProjects", (d.projects || []).join("\n"));
  renderHeroTerm(document.getElementById("htPrevBody"), document.getElementById("htPrevTitle"), d);
}
(function bindTermAdmin() {
  const ids = ["htFTitle","htFPath","htFName","htFRole","htFAge","htFStatus","htFCountry","htFCity","htFStack","htFProjects"];
  const live = () => renderHeroTerm(document.getElementById("htPrevBody"), document.getElementById("htPrevTitle"), htReadForm());
  ids.forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener("input", live); });
  const saveBtn = document.getElementById("aSaveTerm");
  if (saveBtn) saveBtn.addEventListener("click", () => {
    cmsData.texts.term = htReadForm();
    cmsSave();
    renderHeroTerm(document.getElementById("htBody"), document.getElementById("htTitleBar"), getTermData());
    syncServer();
    toast("ترمینال ذخیره و روی سایت اعمال شد ✅", "ok");
  });
  const resetBtn = document.getElementById("aResetTerm");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (!confirm("ترمینال به حالت پیش‌فرض برگردد؟")) return;
    delete cmsData.texts.term;
    cmsSave();
    htFillForm();
    renderHeroTerm(document.getElementById("htBody"), document.getElementById("htTitleBar"), getTermData());
    toast("ترمینال به پیش‌فرض برگشت ↩️", "info");
  });
})();

const typerStops = [];
function startTyper(el, getLines) {
  if (!el) return;
  let li = 0, ch = 0, del = false, timer, stopped = false;
  (function tick() {
    if (stopped) return;
    const lines = getLines();
    const w = lines[li % lines.length];
    el.textContent = w.slice(0, (ch += del ? -1 : 1));
    let wait = del ? 40 : 85;
    if (!del && ch === w.length) { del = true; wait = 1700; }
    else if (del && ch === 0) { del = false; li = (li + 1) % lines.length; wait = 420; }
    timer = setTimeout(tick, wait);
  })();
  typerStops.push(() => { stopped = true; clearTimeout(timer); el.textContent = ""; });
}
function restartTypers() {
  typerStops.splice(0).forEach((f) => f());
  startTyper(document.getElementById("typer"), () => TYPER_LINES.map(L));
}

function applyDynamicTexts() {
  const brandHTML = SITE.en + (SITE.accent ? `<b>${SITE.accent}</b>` : "");
  const b1 = document.getElementById("brandEn"); if (b1) b1.innerHTML = brandHTML;
  const b2 = document.getElementById("brandEnTop"); if (b2) b2.innerHTML = brandHTML;
  const fn = document.getElementById("footerName"); if (fn) fn.textContent = LANG === "en" ? SITE.ownerEn : SITE.owner;
  const fn2 = document.getElementById("footerName2"); if (fn2) fn2.textContent = LANG === "en" ? SITE.ownerEn : SITE.owner;
  const hn = document.getElementById("heroName"); if (hn) hn.textContent = LANG === "en" ? SITE.ownerEn : SITE.owner;
  /* ⬅ سال کپی‌رایت — همیشه به‌روز (شمسی برای فارسی، میلادی برای انگلیسی) */
  const yEl = document.getElementById("copyYear");
  if (yEl) {
    const now = new Date();
    yEl.textContent = LANG === "en" ? String(now.getFullYear()) : new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(now);
  }
}
/* اگه نام سایت از قبل ذخیره شده، اعمالش کن */
const savedSiteName = store.get("mehdi-site-name");
if (savedSiteName) SITE.en = savedSiteName;
applyDynamicTexts();

function renderSkills() {
  const wrap = document.getElementById("skillsWrap");
  if (!wrap) return;
  wrap.innerHTML = state.skills.map((s, i) => `
    <div class="skill-pill${i >= 3 ? " extra" : ""}" tabindex="0" style="--ic:${s.c}">
      <i class="${s.icon}"></i>
      <span class="s-name">${L(s.name)}</span>
      <span class="s-cat">${CAT_LABEL[LANG][s.cat] || s.cat}</span>
      <span class="tip"><b>${esc(s.en)}</b>
      <span class="cat${s.cat === "be" ? " be" : s.cat === "tl" ? " tl" : ""}">${CAT_LABEL[LANG][s.cat] || s.cat}</span>
      <p>${L(s.tip)}</p></span>
    </div>`).join("");
  wrap.classList.toggle("expanded", skillsExpanded);
  wrap.querySelectorAll(".skill-pill").forEach((p) =>
    p.addEventListener("click", () => {
      const was = p.classList.contains("open");
      wrap.querySelectorAll(".skill-pill.open").forEach((x) => x.classList.remove("open"));
      if (!was) p.classList.add("open");
    }));
  const moreTxt = document.getElementById("skillsMoreTxt");
  if (moreTxt) moreTxt.textContent = skillsExpanded ? t("less") : t("more");
  const moreBtn = document.getElementById("skillsMore");
  if (moreBtn) moreBtn.classList.toggle("on", skillsExpanded);
}
renderSkills();
document.getElementById("skillsMore").addEventListener("click", () => {
  skillsExpanded = !skillsExpanded;
  renderSkills();
});

function renderTimeline() {
  const el = document.getElementById("timeline");
  if (!el) return;
  el.innerHTML = state.timeline.map((it, i) => `
    <div class="tl-item${i === state.timeline.length - 1 ? " now" : ""}">
      <span class="tl-dot"><i class="${it.icon}"></i></span>
      <span class="tl-when">${L(it.when)}</span>
      <h3>${L(it.h)}</h3>
      <p>${L(it.p)}</p>
    </div>`).join("");
}
renderTimeline();

function renderValues() {
  const el = document.getElementById("valuesList");
  if (!el) return;
  el.innerHTML = VALUES.map((v) => `
    <div class="value-card" style="--ic:${v.c}">
      <span class="v-ic"><i class="${v.icon}"></i></span>
      <div class="v-txt">
        <h3>${L(v.t)}</h3>
        <p>${L(v.p)}</p>
      </div>
    </div>`).join("");
}
renderValues();

const filtersEl = document.getElementById("filters");
const pIndexEl = document.getElementById("pIndex");
let currentFilter = "all";
function renderFilters() {
  if (!filtersEl) return;
  filtersEl.innerHTML = FILTERS.map((f) =>
    `<button class="tech-btn${f.key === currentFilter ? " on" : ""}" data-f="${f.key}"><i class="${f.icon}"></i> ${L(f.label)}<span class="en">${f.en}</span></button>`).join("");
  filtersEl.querySelectorAll(".tech-btn").forEach((b) =>
    b.addEventListener("click", () => { currentFilter = b.dataset.f; renderFilters(); renderProjects(); }));
}
const PROJECTS_PER_VIEW = 6; /* تعداد پروژه‌های نمایش‌داده‌شده در حالت اولیه (۲ ردیف × ۳ ستون) */
let projectsExpanded = false;
function renderProjects() {
  if (!pIndexEl) return;
  const list = state.projects.filter((p) => currentFilter === "all" || p.cat === currentFilter);
  pIndexEl.classList.remove("armed");
  const visible = projectsExpanded ? list : list.slice(0, PROJECTS_PER_VIEW);
  pIndexEl.innerHTML = list.length ? visible.map((p, i) => `
    <button class="p-row" data-i="${state.projects.indexOf(p)}" style="--g1:${p.g1};--g2:${p.g2}">
      <span class="p-row-top">
        <span class="p-idx">${String(i + 1).padStart(2, "0")}</span>
        <span style="flex:1;min-width:0">
          <span class="p-title">${L(p.title)}${p.soon ? `<span class="p-soon-tag"><i class="fa-solid fa-hourglass-half"></i> ${t("tagSoon")}</span>` : ""}${p.embed ? `<span class="p-embed-tag"><i class="fa-solid fa-play"></i> ${t("live")}</span>` : ""}</span>
          <span class="p-short">${L(p.short)}</span>
        </span>
        <span class="p-year">${p.year}</span>
      </span>
      <span class="p-cats">${(p.cats||[]).map((c) => `<span class="cat-chip">${esc(c)}</span>`).join("")}</span>
      <i class="fa-solid fa-arrow-left p-arrow"></i>
    </button>`).join("") : `<p style="padding:24px 8px;color:var(--text-secondary)">${t("empty")}</p>`;
  void pIndexEl.offsetWidth;
  pIndexEl.classList.add("armed");
  pIndexEl.querySelectorAll(".p-row").forEach((r) => {
    r.addEventListener("click", () => {
      const pr = state.projects[+r.dataset.i];
      pr.embed ? openSite(pr) : openProject(pr);
    });
    /* افکت 3D Tilt با حرکت ماوس روی کارت */
    r.addEventListener("mousemove", (e) => {
      const rect = r.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      r.style.setProperty("--mx", x + "%");
      r.style.setProperty("--my", y + "%");
      const rx = ((y / 100) - 0.5) * -8;
      const ry = ((x / 100) - 0.5) * 8;
      r.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    r.addEventListener("mouseleave", () => {
      r.style.transform = "";
    });
  });
  /* مدیریت دکمه‌ی نمایش بیشتر/کمتر */
  const pMoreBtn = document.getElementById("pMore");
  const pMoreTxt = document.getElementById("pMoreTxt");
  if (pMoreBtn && pMoreTxt) {
    if (list.length > PROJECTS_PER_VIEW) {
      pMoreBtn.hidden = false;
      if (projectsExpanded) {
        pMoreTxt.textContent = t("less");
        pMoreBtn.classList.add("on");
      } else {
        pMoreTxt.textContent = t("more");
        pMoreBtn.classList.remove("on");
      }
    } else {
      pMoreBtn.hidden = true;
    }
  }
}
renderFilters(); renderProjects();
/* کلیک روی دکمه‌ی نمایش بیشتر/کمتر پروژه‌ها */
const pMoreBtnEl = document.getElementById("pMore");
if (pMoreBtnEl) pMoreBtnEl.addEventListener("click", () => {
  projectsExpanded = !projectsExpanded;
  renderProjects();
  if (!projectsExpanded) {
    const sec = document.getElementById("projects");
    if (sec) { if (window.smoothScrollTo) smoothScrollTo(sec); else sec.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
});

const pModal = document.getElementById("pModal");
const hasLink = (v) => v && v !== "#";
function openProject(p) {
  if (!pModal) return;
  document.getElementById("mIcon").className = p.icon;
  document.getElementById("mHead").style.setProperty("--g1", p.g1);
  document.getElementById("mHead").style.setProperty("--g2", p.g2);
  document.getElementById("mCat").textContent = CAT_LABEL[LANG][p.cat] || p.cat;
  document.getElementById("mYear").textContent = p.year;
  document.getElementById("mTitle").textContent = L(p.title);
  document.getElementById("mDesc").textContent = L(p.desc);
  document.getElementById("mTags").innerHTML = (p.cats||[]).map((c) => `<span>${esc(c)}</span>`).join("");
  const Lk = p.links || {};
  const src = Lk.source === "gh" ? GITHUB.url : Lk.source;
  let html = "";
  if (p.embed) html += `<button class="mini-btn pri" data-embed><i class="fa-solid fa-play"></i> ${t("view")}</button>`;
  if (hasLink(Lk.demo)) html += `<a class="mini-btn pri" href="${Lk.demo}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> ${t("demo")}</a>`;
  if (hasLink(src)) html += `<a class="mini-btn" href="${src}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i> ${t("src")}</a>`;
  if (hasLink(Lk.video)) html += `<a class="mini-btn" href="${Lk.video}" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> ${t("video")}</a>`;
  if (!html) html += `<button class="mini-btn" data-soon><i class="fa-solid fa-hourglass-half"></i> ${t("notPub")}</button>`;
  const acts = document.getElementById("mActions");
  acts.innerHTML = html;
  acts.querySelectorAll("[data-soon]").forEach((b) => b.addEventListener("click", () => toast(t("projSoon"), "info")));
  acts.querySelectorAll("[data-embed]").forEach((b) => b.addEventListener("click", () => { closeProject(); openSite(p); }));
  pModal.classList.add("open");
  document.body.style.overflow = "hidden";
  if (window.lenis) window.lenis.stop();
}
function closeProject() { if (pModal) { pModal.classList.remove("open"); document.body.style.overflow = ""; if (window.lenis) window.lenis.start(); } }
if (pModal) pModal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeProject));

const siteModal = document.getElementById("siteModal");
function openSite(p) {
  if (!siteModal) return;
  document.getElementById("sfTitle").textContent = L(p.title) + " — " + (LANG === "en" ? "Live preview" : "پیش‌نمایش زنده");
  document.getElementById("sfNewTab").href = p.embed;
  document.getElementById("sfFrame").src = p.embed;
  siteModal.classList.add("open");
  document.body.style.overflow = "hidden";
  if (window.lenis) window.lenis.stop();
}
function closeSite() {
  if (!siteModal) return;
  siteModal.classList.remove("open");
  document.getElementById("sfFrame").src = "about:blank";
  document.body.style.overflow = "";
  if (window.lenis) window.lenis.start();
}
if (siteModal) siteModal.querySelectorAll("[data-sclose]").forEach((el) => el.addEventListener("click", closeSite));

const burger = document.getElementById("burger");
const mobilePanel = document.getElementById("mobilePanel");
if (burger && mobilePanel) {
  burger.addEventListener("click", (e) => { e.stopPropagation(); burger.classList.toggle("open"); mobilePanel.classList.toggle("open"); });
  mobilePanel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { burger.classList.remove("open"); mobilePanel.classList.remove("open"); }));
}

if (window.IntersectionObserver) {
  const spyLinks = document.querySelectorAll("[data-spy]");
  const spyIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) spyLinks.forEach((l) => l.classList.toggle("active", l.dataset.spy === en.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["home", "skills", "projects", "about", "contact"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) spyIO.observe(s);
  });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
    });
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));
  const counterRow = document.getElementById("counterRow");
  if (counterRow) {
    new IntersectionObserver((en, io) => {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      document.querySelectorAll("[data-count]").forEach((el) => {
        const target = +el.dataset.count, plus = el.dataset.plus || "";
        const t0 = performance.now(), dur = 1300;
        (function f(now) {
          const p = Math.min(1, (now - t0) / dur);
          el.textContent = faNum(Math.round(target * (1 - Math.pow(1 - p, 3)))) + plus;
          if (p < 1) requestAnimationFrame(f);
        })(t0);
      });
    }, { threshold: .4 }).observe(counterRow);
  }
}

const copyTgBtn = document.getElementById("copyTg");
if (copyTgBtn) copyTgBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  try { await navigator.clipboard.writeText("@" + tgIdNow()); toast(t("copied"), "ok"); }
  catch (err) { toast(t("copyFail") + "@" + tgIdNow(), "warn"); }
});
const tgBtnEl = document.getElementById("tgBtn");
if (tgBtnEl) tgBtnEl.addEventListener("click", () => window.open("https://t.me/" + tgIdNow(), "_blank", "noopener"));
const availBtn = document.getElementById("availBtn");
if (availBtn) availBtn.addEventListener("click", () => {
  const c = document.getElementById("contact");
  if (!c) return;
  if (window.smoothScrollTo) smoothScrollTo(c); else c.scrollIntoView({ behavior: "smooth" });
});
function downloadPdf() { toast(t("pdfHint"), "info"); setTimeout(() => window.print(), 600); }
const pp = document.getElementById("pdfPanelBtn"); if (pp) pp.addEventListener("click", downloadPdf);
/* دکمه بازگشت به بالای صفحه در فوتر */
const fBackTop = document.getElementById("fBackTop");
if (fBackTop) fBackTop.addEventListener("click", () => {
  if (window.lenis) window.lenis.scrollTo(0, { duration: 1.1 });
  else window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ═══ تنظیم سایز فونت در پنل شخصی‌سازی ═══ */
const FONT_KEY = "mehdi-font-scale";
function applyFontScale(v) {
  const scale = parseFloat(v) || 1;
  document.documentElement.style.setProperty("--font-scale", scale);
  document.body.style.fontSize = `${0.925 * scale}rem`;
  document.querySelectorAll(".sp-fs button").forEach((b) => b.classList.toggle("active", parseFloat(b.dataset.fs) === scale));
}
applyFontScale(store.get(FONT_KEY) || "1");
document.querySelectorAll(".sp-fs button").forEach((b) => {
  b.addEventListener("click", () => {
    const v = b.dataset.fs;
    applyFontScale(v);
    store.set(FONT_KEY, v);
  });
});

const settingsPanel = document.getElementById("settingsPanel");
function toggleSettingsPanel(open) {
  if (open === undefined) open = !settingsPanel.classList.contains("open");
  settingsPanel.classList.toggle("open", open);
  document.body.classList.toggle("settings-open", open);
}
document.querySelectorAll(".brush-btn").forEach((btn) =>
  btn.addEventListener("click", (e) => {
    if (btn.classList.contains("sp-pdf")) return;
    e.stopPropagation();
    toggleSettingsPanel();
  }));
document.getElementById("spClose").addEventListener("click", () => toggleSettingsPanel(false));

const modeBtns = document.querySelectorAll(".sp-modes button[data-mode]");
function setMode(mode, save = true) {
  document.body.classList.toggle("light", mode === "light");
  modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  if (save) store.set("mehdi-theme", mode);
}
modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
setMode(store.get("mehdi-theme") || "dark", false);

const ACCENTS = [
  { c: "#45b9ff", s: "#7cd3ff" }, { c: "#8b7cff", s: "#b3a8ff" }, { c: "#3ddc97", s: "#7ceab9" },
  { c: "#ff9f43", s: "#ffbe78" }, { c: "#ff6b9d", s: "#ff9cbd" }, { c: "#ffd60a", s: "#ffe470" }, { c: "#2dd4bf", s: "#6fe6d8" },
];
const spColors = document.getElementById("spColors");
let accentColor = ACCENTS[0].c;
ACCENTS.forEach((a, i) => {
  const b = document.createElement("button");
  b.className = "sp-swatch"; b.style.background = a.c; b.title = "Color " + (i + 1);
  b.addEventListener("click", () => setAccent(i, true));
  spColors.appendChild(b);
});
function setAccent(i, save) {
  const a = ACCENTS[i]; if (!a) return;
  document.documentElement.style.setProperty("--sk", a.c);
  document.documentElement.style.setProperty("--sk-strong", a.s);
  accentColor = a.c;
  spColors.querySelectorAll(".sp-swatch").forEach((sw, j) => sw.classList.toggle("active", j === i));
  if (save) store.set("mehdi-accent", i);
  window.dispatchEvent(new Event('accent-changed'));
}
const savedAccent = parseInt(store.get("mehdi-accent") ?? "0", 10);
setAccent(ACCENTS[savedAccent] ? savedAccent : 0, false);

const langBtns = document.querySelectorAll(".sp-modes button[data-lang]");
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "en" ? "ltr" : "rtl";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (!el.dataset.fa) el.dataset.fa = el.innerHTML;
    el.innerHTML = LANG === "en" ? (EN[el.dataset.i18n] ?? el.dataset.fa) : el.dataset.fa;
  });
  langBtns.forEach((b) => b.classList.toggle("active", b.dataset.lang === LANG));
  document.title = TITLES[LANG];
  applyDynamicTexts();
  restartTypers();
  closeProject();
  const leadEl = document.querySelector(".lead");
  if (leadEl) {
    if (LANG === "en" && state.texts.leadEn) leadEl.innerHTML = state.texts.leadEn;
    else if (LANG === "fa" && state.texts.leadFa) leadEl.innerHTML = state.texts.leadFa;
  }
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = faNum(+el.dataset.count) + (el.dataset.plus || "");
  });
  store.set("mehdi-lang", LANG);
  applyAvail(store.get(AVAIL_KEY) || "open");
  /* ⬅ رندر مجدد محتوای پنل ادمین وقتی زبان عوض شد */
  if (typeof adminEl !== "undefined" && adminEl && adminEl.classList.contains("open")) {
    if (typeof renderDash === "function") renderDash();
    if (typeof renderAdminProjects === "function") renderAdminProjects();
    if (typeof renderAdminSkills === "function") renderAdminSkills();
    if (typeof renderAdminTimeline === "function") renderAdminTimeline();
    if (typeof fillSettings === "function") fillSettings();
  }
  /* ⬅ رندر مجدد پروژه‌ها، مهارت‌ها و تایم‌لاین سایت */
  if (typeof renderSkills === "function") renderSkills();
  if (typeof renderProjects === "function") renderProjects();
  if (typeof renderTimeline === "function") renderTimeline();
  if (typeof renderValues === "function") renderValues();
  if (typeof renderContact === "function") renderContact();
  if (typeof renderSocialLinks === "function") renderSocialLinks();
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}
langBtns.forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.lang === LANG) return;
  LANG = b.dataset.lang; applyLang(); toast(t("langSet"), "ok");
}));

const scrollBar = document.getElementById("scrollProgress");
function updateProgress() {
  const h = document.documentElement;
  const max = h.scrollHeight - innerHeight;
  scrollBar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
}
addEventListener("scroll", updateProgress, { passive: true });
updateProgress();
const pre = document.getElementById("preloader");
setTimeout(() => { pre.classList.add("done"); setTimeout(() => pre.remove(), 600); }, 1300);

(function particles() {
  const canvas = document.getElementById("particles");
  if (!canvas || !canvas.getContext || mm("(prefers-reduced-motion: reduce)")) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const hero = canvas.parentElement;
  const mouse = { x: -9999, y: -9999 };
  let W = 0, H = 0, pts = [];
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  function resize() {
    const r = hero.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * d; canvas.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const N = Math.min(55, Math.floor(W * H / 22000));
    pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.8 + 1,
    }));
  }
  resize();
  addEventListener("resize", resize);
  hero.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
  (function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    const LINK = 110;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fillStyle = hexA(accentColor, .5); ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < LINK) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = hexA(accentColor, .13 * (1 - d / LINK)); ctx.lineWidth = 1; ctx.stroke();
        }
      }
      const md = Math.hypot(pts[i].x - mouse.x, pts[i].y - mouse.y);
      if (md < 140) {
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = hexA(accentColor, .22 * (1 - md / 140)); ctx.lineWidth = 1; ctx.stroke();
      }
    }
  })();
})();

/* ═══════════════════════════════════════
   ورود ادمین (۳ کلیک روی لوگو) + پنل ادمین
   ⬅ امنیت: رمز مدیر هیچ‌جای کد نیست — بار اول روی سرور ساخته می‌شود
     (hash با password_hash در data/config.json خارج از دسترس وب ذخیره می‌شود)
   ═══════════════════════════════════════ */
const adminEl = document.getElementById("admin");
const loginModal = document.getElementById("loginModal");
let work = null, dirty = 0, afCtx = null;

/* ⬅ دکمه‌ی نمایش/پنهان رمز عبور */
document.addEventListener("click", (e) => {
  const eb = e.target.closest("[data-eye]");
  if (!eb) return;
  const inp = document.getElementById(eb.dataset.eye);
  if (!inp) return;
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  eb.querySelector("i").className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
  const sp = eb.querySelector("span");
  if (sp) sp.textContent = show ? t("hidePw") : t("showPw");
});

let logoClicks = 0, logoTimer = null;
document.querySelectorAll(".side-logo").forEach((logo) => {
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    logoClicks++;
    logo.style.transition = "transform .2s";
    logo.style.transform = `rotate(${logoClicks * 15}deg)`;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; logo.style.transform = ""; }, 1200);
    if (logoClicks >= 3) {
      logoClicks = 0;
      logo.style.transform = "";
      openLogin();
    }
  });
});

/* ⬅ حالت مودال: ورود / تعیین رمز (بار اول) / آفلاین */
function lgMode(mode) {
  document.getElementById("lgLoginBox").hidden = mode !== "login";
  document.getElementById("lgSetupBox").hidden = mode !== "setup";
  document.getElementById("lgOfflineBox").hidden = mode !== "offline";
  document.getElementById("lgErr").textContent = "";
  document.getElementById("lgOk").textContent = "";
  document.getElementById("suErr").textContent = "";
  const focusId = mode === "setup" ? "suPass1" : "lgPass";
  setTimeout(() => { const el = document.getElementById(focusId); if (el && mode !== "offline") el.focus(); }, 100);
}

async function openLogin() {
  loginModal.classList.add("open");
  document.body.style.overflow = "hidden";
  if (window.lenis) window.lenis.stop();
  if (!API.online) { lgMode("offline"); return; }
  try {
    const { status, j } = await apiCall("?action=auth");
    if (status === 200 && j && j.ok) {
      if (j.auth) { closeLogin(); openAdmin(); return; } /* نشست سرور هنوز زنده است */
      lgMode(j.needsSetup ? "setup" : "login");
      if (j.needsSetup) {
        document.getElementById("setupNote").textContent =
          "اولین بار است پنل را باز می‌کنی — یک رمز برای خودت تعیین کن (حداقل ۸ کاراکتر). این رمز فقط روی سرور (هش‌شده) ذخیره می‌شود.";
      }
      return;
    }
    lgMode("offline");
  } catch (e) { lgMode("offline"); }
}
function closeLogin() { loginModal.classList.remove("open"); document.body.style.overflow = ""; if (window.lenis) window.lenis.start(); }
loginModal.querySelectorAll("[data-lclose]").forEach((el) => el.addEventListener("click", closeLogin));

function loginFail(msg) {
  const err = document.getElementById("lgErr");
  err.textContent = msg || "رمز اشتباهه — دوباره امتحان کن";
  loginModal.querySelector(".modal-card").style.animation = "none";
  void loginModal.querySelector(".modal-card").offsetWidth;
  loginModal.querySelector(".modal-card").style.animation = "";
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), 650);
}

async function tryLogin() {
  if (!API.online) { lgMode("offline"); return; }
  const p = document.getElementById("lgPass").value;
  if (!p) { loginFail("رمز را وارد کن"); return; }
  const btn = document.getElementById("lgGo");
  btn.disabled = true;
  try {
    const { status, j } = await apiCall("?action=login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass: p }),
    });
    if (status === 200 && j && j.ok) {
      afterAuth();
    } else if (status === 429 && j && j.lock) {
      loginFail(`تلاش‌های ناموفق زیاد بود — ${faNum(Math.ceil(j.lock / 60))} دقیقه قفلی ⛔`);
    } else if (status === 401 && j && j.left) {
      loginFail(`رمز اشتباهه (${faNum(j.left)} تلاش دیگر تا قفل)`);
    } else {
      loginFail();
    }
  } catch (e) { loginFail("ارتباط با سرور برقرار نشد"); }
  btn.disabled = false;
}

async function trySetup() {
  const p1 = document.getElementById("suPass1").value;
  const p2 = document.getElementById("suPass2").value;
  const err = document.getElementById("suErr");
  err.textContent = "";
  if (p1.length < 8) { err.textContent = "رمز باید حداقل ۸ کاراکتر باشد"; return; }
  if (p1 !== p2) { err.textContent = "تکرار رمز با رمز یکی نیست"; return; }
  const btn = document.getElementById("suGo");
  btn.disabled = true;
  try {
    const { status, j } = await apiCall("?action=setup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass: p1 }),
    });
    if (status === 200 && j && j.ok) {
      document.getElementById("suPass1").value = "";
      document.getElementById("suPass2").value = "";
      afterAuth();
      toast("رمز ساخته شد ✅", "ok");
    } else if (status === 409) {
      err.textContent = "رمز قبلاً ساخته شده — با همان رمز وارد شو";
      lgMode("login");
    } else if (status === 429 && j && j.lock) {
      err.textContent = `تلاش زیاد — ${faNum(Math.ceil(j.lock / 60))} دقیقه قفلی ⛔`;
    } else {
      err.textContent = "ساخت رمز روی سرور ناموفق بود";
    }
  } catch (e) { err.textContent = "ارتباط با سرور برقرار نشد"; }
  btn.disabled = false;
}

function afterAuth() {
  document.getElementById("lgErr").textContent = "";
  document.getElementById("lgOk").textContent = "";
  document.getElementById("lgPass").value = "";
  closeLogin();
  sess.set("mehdi-admin", "1");
  API.authed = true;
  openAdmin();
  toast("خوش اومدی رئیس 👑", "ok");
}

document.getElementById("lgGo").addEventListener("click", tryLogin);
document.getElementById("suGo").addEventListener("click", trySetup);
["lgPass"].forEach((id) =>
  document.getElementById(id).addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); }));
["suPass1", "suPass2"].forEach((id) =>
  document.getElementById(id).addEventListener("keydown", (e) => { if (e.key === "Enter") trySetup(); }));

/* ═══ پنل ادمین ═══ */
function openAdmin() {
  work = JSON.parse(JSON.stringify({ projects: state.projects, skills: state.skills, timeline: state.timeline }));
  work.projects.forEach((p, i) => (p._uid = "p" + i));
  work.skills.forEach((s, i) => (s._uid = "s" + i));
  work.timeline.forEach((tl, i) => (tl._uid = "t" + i));
  dirty = 0; updateSaveBar();
  adminEl.classList.add("open");
  document.body.style.overflow = "hidden";
  if (window.lenis) window.lenis.stop();
  renderDash(); renderAdminProjects(); renderAdminSkills(); renderAdminTimeline();  fillSettings();
  htFillForm();
  /* همگام‌سازی رادیو وضعیت همکاری */
  const cur = store.get(AVAIL_KEY) || "open";
  const radio = document.querySelector(`.av-opt input[value="${cur}"]`);
  if (radio) {
    radio.checked = true;
    document.querySelectorAll(".av-opt").forEach((o) => o.classList.toggle("on", o.dataset.av === cur));
  }
}
function closeAdmin() {
  adminEl.classList.remove("open");
  document.body.style.overflow = "";
  if (window.lenis) window.lenis.start();
}
document.getElementById("aView").addEventListener("click", closeAdmin);
document.getElementById("aLogout").addEventListener("click", () => {
  sess.del("mehdi-admin");
  API.authed = false;
  if (API.online) apiCall("?action=logout", { method: "POST" }).catch(() => {});
  closeAdmin();
  toast("از پنل خارج شدی 👋", "info");
});

adminEl.querySelectorAll(".a-tab").forEach((b) =>
  b.addEventListener("click", () => {
    adminEl.querySelectorAll(".a-tab").forEach((x) => x.classList.toggle("on", x === b));
    adminEl.querySelectorAll(".a-pane").forEach((p) => p.classList.toggle("on", p.id === "pane-" + b.dataset.tab));
    if (b.dataset.tab === "dash") renderDash();
    if (b.dataset.tab === "stats") renderStats();
  }));

function updateSaveBar() {
  document.getElementById("aSave").hidden = dirty === 0;
  document.getElementById("aDirty").textContent = faNum(dirty);
}
function touch() { dirty++; updateSaveBar(); }
document.getElementById("aSave").addEventListener("click", () => {
  cmsData.projects = work.projects.map(({ _uid, ...r }) => r);
  cmsData.skills = work.skills.map(({ _uid, ...r }) => r);
  cmsData.timeline = work.timeline.map(({ _uid, ...r }) => r);
  cmsSave();
  dirty = 0; updateSaveBar();
  renderSkills(); renderProjects(); renderTimeline(); applyLang();
  syncServer();
  if (window.ScrollTrigger) ScrollTrigger.refresh();
  toast("تغییرات ذخیره و روی سایت اعمال شد ✅", "ok");
});

function renderDash() {
  const en = LANG === "en";
  document.getElementById("aStats").innerHTML = `
    <div class="a-stat"><i class="fa-solid fa-folder"></i><b>${faNum(work.projects.length)}</b><span>${en ? "Projects" : "پروژه"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-bolt"></i><b>${faNum(work.skills.length)}</b><span>${en ? "Skills" : "مهارت"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-route"></i><b>${faNum(work.timeline.length)}</b><span>${en ? "Timeline Steps" : "مرحله تایم‌لاین"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-calendar-day"></i><b>${faNum(Object.keys(getVisits()).length)}</b><span>${en ? "Days Tracked" : "روز ثبت شده"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-eye"></i><b>${faNum(Object.values(getVisits()).reduce((a,b)=>a+b,0))}</b><span>${en ? "Total Visits" : "کل بازدیدها"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-palette"></i><b>${ACCENTS.length}</b><span>${en ? "Color Themes" : "تم رنگی"}</span></div>`;
  const aLast = document.getElementById("aLast");
  if (aLast) aLast.textContent = cmsData._at
    ? (en ? "Last saved: " : "آخرین ذخیره: ") + new Date(cmsData._at).toLocaleString(en ? "en-US" : "fa-IR")
    : (en ? "No changes saved yet — defaults are active." : "هنوز تغییری ذخیره نشده — داده‌ها پیش‌فرض هستن.");
}

async function renderStats() {
  const en = LANG === "en";
  let v = getVisits();
  /* اگر بک‌اند فعال باشد، آمار واقعی سرور (همه‌ی بازدیدکننده‌ها) نمایش داده می‌شود */
  if (API.online) {
    try { const { status, j } = await apiCall("?action=stats"); if (status === 200 && j && j.ok && j.visits) v = j.visits; } catch (e) {}
  }
  const total = Object.values(v).reduce((a,b)=>a+b,0);
  const today = new Date().toISOString().slice(0,10);
  const todayC = v[today] || 0;
  const days = Object.keys(v).length;
  /* ⬅ رفع باگ: مقیاس نمودار بر اساس ۱۴ روزِ نمایش‌داده‌شده محاسبه شود نه کل تاریخچه */
  const shown = [];
  for(let i=13;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    shown.push({
      key: d.toISOString().slice(0,10),
      c: v[d.toISOString().slice(0,10)] || 0,
      lbl: en ? (d.getMonth()+1)+"/"+d.getDate() : d.toLocaleDateString("fa-IR",{day:"numeric",month:"numeric"}),
    });
  }
  const max = Math.max(1, ...shown.map((x) => x.c));
  const cols = shown.map((x, idx) => {
    const h = Math.max(4, Math.round((x.c/max)*100));
    return `<div class="v-col${idx === shown.length - 1 ? " today" : ""}" title="${x.key}: ${x.c} ${en?"visits":"بازدید"}">
      <span class="v-num">${x.c?faNum(x.c):""}</span>
      <div class="v-bar" style="height:${h}%"></div>
      <span class="v-lbl">${x.lbl}</span></div>`;
  });
  document.getElementById("vStats").innerHTML = `
    <div class="a-stat"><i class="fa-solid fa-eye"></i><b>${faNum(total)}</b><span>${en?"Total Visits":"کل بازدیدها"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-calendar-day"></i><b>${faNum(todayC)}</b><span>${en?"Today":"امروز"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-calendar-check"></i><b>${faNum(days)}</b><span>${en?"Active Days":"روز فعال"}</span></div>
    <div class="a-stat"><i class="fa-solid fa-fire"></i><b>${faNum(max)}</b><span>${en?"Peak Day":"رکورد یک روز"}</span></div>`;
  document.getElementById("vChart").innerHTML = cols.join("");
}

function renderAdminProjects() {
  document.getElementById("aProjList").innerHTML = work.projects.map((p, i) => `
    <div class="a-item">
      <span class="ai-ic" style="--aic:${p.g1}"><i class="${p.icon}"></i></span>
      <div class="ai-info"><b>${esc(L(p.title))}${p.soon ? " ⏳" : ""}${p.embed ? " 🟢" : ""}</b><span>${esc(L(p.short))}</span></div>
      <div class="ai-acts">
        <button class="ai-btn" data-edit="${i}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
        <button class="ai-btn del" data-del="${i}" title="حذف"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join("") || `<p style="color:var(--text-secondary);font-size:.85rem">هنوز پروژه‌ای نیست — یکی اضافه کن!</p>`;
  bindList("aProjList", "proj");
}
function renderAdminSkills() {
  document.getElementById("aSkillList").innerHTML = work.skills.map((s, i) => `
    <div class="a-item">
      <span class="ai-ic" style="--aic:${s.c}"><i class="${s.icon}"></i></span>
      <div class="ai-info"><b>${esc(L(s.name))}</b><span>${esc(s.en)} · ${CAT_LABEL.fa[s.cat] || s.cat}</span></div>
      <div class="ai-acts">
        <button class="ai-btn" data-edit="${i}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
        <button class="ai-btn del" data-del="${i}" title="حذف"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join("") || `<p style="color:var(--text-secondary);font-size:.85rem">هنوز مهارتی نیست!</p>`;
  bindList("aSkillList", "skill");
}
function renderAdminTimeline() {
  document.getElementById("aTlList").innerHTML = work.timeline.map((tl, i) => `
    <div class="a-item">
      <span class="ai-ic"><i class="${tl.icon}"></i></span>
      <div class="ai-info"><b>${esc(L(tl.when))} — ${esc(L(tl.h))}</b><span>${esc(L(tl.p))}</span></div>
      <div class="ai-acts">
        <button class="ai-btn" data-edit="${i}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
        <button class="ai-btn del" data-del="${i}" title="حذف"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join("") || `<p style="color:var(--text-secondary);font-size:.85rem">تایم‌لاین خالیه!</p>`;
  bindList("aTlList", "tl");
}
function bindList(listId, type) {
  const list = document.getElementById(listId);
  list.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => openForm(type, +b.dataset.edit)));
  list.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const arr = type === "proj" ? work.projects : type === "skill" ? work.skills : work.timeline;
      if (confirm("مطمئنی حذف بشه؟")) {
        arr.splice(+b.dataset.del, 1);
        touch();
        type === "proj" ? renderAdminProjects() : type === "skill" ? renderAdminSkills() : renderAdminTimeline();
        renderDash();
      }
    }));
}
document.getElementById("aAddProj").addEventListener("click", () => openForm("proj", -1));
document.getElementById("aAddSkill").addEventListener("click", () => openForm("skill", -1));
document.getElementById("aAddTl").addEventListener("click", () => openForm("tl", -1));

const afModal = document.getElementById("afModal");
function biField(label, key, faV, enV, ta) {
  return `<label class="a-lbl">${label} <span style="opacity:.6">(فا / EN)</span></label>
    <div class="a-grid2">
      <div><span class="a-lbl" style="margin:0 0 3px">🇮🇷</span>${ta ? `<textarea class="a-in" data-k="${key}.fa">${esc(faV)}</textarea>` : `<input class="a-in" data-k="${key}.fa" value="${esc(faV)}">`}</div>
      <div><span class="a-lbl" style="margin:0 0 3px">🇬🇧</span>${ta ? `<textarea class="a-in ltr" data-k="${key}.en">${esc(enV)}</textarea>` : `<input class="a-in ltr" data-k="${key}.en" value="${esc(enV)}">`}</div>
    </div>`;
}
function openForm(type, idx) {
  afCtx = { type, idx };
  let f = "";
  if (type === "proj") {
    const p = idx >= 0 ? work.projects[idx] : { title:{fa:"",en:""}, short:{fa:"",en:""}, cat:"web", cats:["HTML","CSS"], year:"۱۴۰۴", icon:"fa-solid fa-code", g1:"#45b9ff", g2:"#1b3a5c", desc:{fa:"",en:""}, links:{demo:"",source:""}, embed:"", soon:false };
    document.getElementById("afTitle").textContent = idx >= 0 ? (LANG==="en"?"Edit Project":"ویرایش پروژه") : (LANG==="en"?"New Project":"پروژه جدید");
    f = biField(LANG==="en"?"Title":"عنوان", "title", p.title.fa, p.title.en)
      + biField(LANG==="en"?"Short Description":"توضیح کوتاه", "short", p.short.fa, p.short.en)
      + biField(LANG==="en"?"Full Description (modal)":"توضیح کامل (مودال)", "desc", p.desc.fa, p.desc.en, true)
      + `<div class="a-grid2">
          <div><label class="a-lbl">${LANG==="en"?"Category":"دسته‌بندی"}</label>
            <select class="a-in" data-k="cat">
              <option value="web"${p.cat === "web" ? " selected" : ""}>${LANG==="en"?"Frontend & Backend":"فرانت‌اند و بک‌اند"}</option>
              <option value="py"${p.cat === "py" ? " selected" : ""}>${LANG==="en"?"Python":"پایتون"}</option>
            </select></div>
          <div><label class="a-lbl">${LANG==="en"?"Year":"سال"}</label><input class="a-in" data-k="year" value="${esc(p.year)}"></div>
         </div>
         <label class="a-lbl">${LANG==="en"?"Tags (comma separated)":"تک‌ها (با ویرگول جدا کن)"}</label>
         <input class="a-in" data-k="cats" value="${esc((p.cats||[]).join(", "))}">
         <div class="a-grid2">
          <div><label class="a-lbl">${LANG==="en"?"Icon (FontAwesome class)":"آیکون (کلاس FontAwesome)"}</label><input class="a-in ltr" data-k="icon" value="${esc(p.icon)}"></div>
          <div><label class="a-lbl">${LANG==="en"?"Modal gradient colors":"رنگ‌های گرادیان مودال"}</label>
            <div style="display:flex;gap:8px"><input type="color" class="a-in" style="padding:4px" data-k="g1" value="${esc(p.g1)}"><input type="color" class="a-in" style="padding:4px" data-k="g2" value="${esc(p.g2)}"></div></div>
         </div>
         <div class="a-grid2">
          <div><label class="a-lbl">${LANG==="en"?"Demo (link — empty = hidden)":"دمو (لینک — خالی = مخفی)"}</label><input class="a-in ltr" data-k="links.demo" value="${esc(p.links?.demo || "")}"></div>
          <div><label class="a-lbl">${LANG==="en"?"Source (\"gh\" = my GitHub)":"سورس (\"gh\" = گیت‌هاب من)"}</label><input class="a-in ltr" data-k="links.source" value="${esc(p.links?.source || "")}"></div>
         </div>
         <label class="a-lbl">Internal demo file (e.g. trisa.html) — drag & drop</label>
         <div class="embed-dropzone" id="embedDropzone" style="border:2px dashed var(--border-color);border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:.25s;margin-bottom:8px">
           <input class="a-in ltr" data-k="embed" value="${esc(p.embed || "")}" style="margin-bottom:8px" placeholder="trisa.html or drop a file here">
           <div style="font-size:.72rem;color:var(--text-secondary);padding:8px"><i class="fa-solid fa-file-arrow-down"></i> Drop HTML file here or click to browse</div>
           <input type="file" id="embedFileInput" accept=".html,.htm,text/html" hidden>
         </div>
         <label class="a-lbl" style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" data-k="soon"${p.soon ? " checked" : ""}> نمایش «به زودی»</label>`;
  } else if (type === "skill") {
    const s = idx >= 0 ? work.skills[idx] : { name:{fa:"",en:""}, en:"", icon:"fa-solid fa-code", c:"#45b9ff", cat:"fe", tip:{fa:"",en:""} };
    document.getElementById("afTitle").textContent = idx >= 0 ? (LANG==="en"?"Edit Skill":"ویرایش مهارت") : (LANG==="en"?"New Skill":"مهارت جدید");
    f = biField(LANG==="en"?"Skill Name":"نام مهارت", "name", s.name.fa, s.name.en)
      + `<div class="a-grid2">
          <div><label class="a-lbl">${LANG==="en"?"English Subtitle":"زیرنویس انگلیسی"}</label><input class="a-in ltr" data-k="en" value="${esc(s.en)}"></div>
          <div><label class="a-lbl">${LANG==="en"?"Category":"دسته"}</label>
            <select class="a-in" data-k="cat">
              <option value="fe"${s.cat === "fe" ? " selected" : ""}>${LANG==="en"?"Frontend":"فرانت‌اند"}</option>
              <option value="be"${s.cat === "be" ? " selected" : ""}>${LANG==="en"?"Backend":"بک‌اند"}</option>
              <option value="tl"${s.cat === "tl" ? " selected" : ""}>${LANG==="en"?"Tools":"ابزارها"}</option>
            </select></div>
         </div>
         <div class="a-grid2">
          <div><label class="a-lbl">${LANG==="en"?"Icon":"آیکون"}</label><input class="a-in ltr" data-k="icon" value="${esc(s.icon)}"></div>
          <div><label class="a-lbl">${LANG==="en"?"Color":"رنگ"}</label><input type="color" class="a-in" style="padding:4px" data-k="c" value="${esc(s.c)}"></div>
         </div>`
      + biField(LANG==="en"?"Hover Tip":"توضیح هاور", "tip", s.tip.fa, s.tip.en, true);
  } else {
    const tl = idx >= 0 ? work.timeline[idx] : { when:{fa:"",en:""}, icon:"fa-solid fa-star", h:{fa:"",en:""}, p:{fa:"",en:""} };
    document.getElementById("afTitle").textContent = idx >= 0 ? (LANG==="en"?"Edit Step":"ویرایش مرحله") : (LANG==="en"?"New Step":"مرحله جدید");
    f = biField(LANG==="en"?"When":"زمان", "when", tl.when.fa, tl.when.en)
      + biField(LANG==="en"?"Title":"عنوان", "h", tl.h.fa, tl.h.en)
      + biField(LANG==="en"?"Description":"توضیح", "p", tl.p.fa, tl.p.en, true)
      + `<label class="a-lbl">${LANG==="en"?"Icon":"آیکون"}</label><input class="a-in ltr" data-k="icon" value="${esc(tl.icon)}">`;
  }
  document.getElementById("afFields").innerHTML = f;
  afModal.classList.add("open");
  /* ⬅ drag-drop برای فیلد embed */
  const dz = document.getElementById("embedDropzone");
  const embedInput = document.querySelector('[data-k="embed"]');
  const fileInput = document.getElementById("embedFileInput");
  if (dz && embedInput) {
    dz.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT" && fileInput) fileInput.click(); });
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.style.borderColor = "var(--sk)"; dz.style.background = "rgba(69,185,255,.06)"; });
    dz.addEventListener("dragleave", () => { dz.style.borderColor = "var(--border-color)"; dz.style.background = ""; });
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.style.borderColor = "var(--border-color)"; dz.style.background = "";
      const file = e.dataTransfer.files[0];
      if (file) handleEmbedFile(file, embedInput);
    });
    if (fileInput) fileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) handleEmbedFile(e.target.files[0], embedInput);
    });
  }
}
/* ⬅ وقتی فایل HTML دراپ می‌شه، محتوا رو به‌عنوان data URI ذخیره کن */
function handleEmbedFile(file, input) {
  if (file.size > 2 * 1024 * 1024) { toast("File too large — max 2MB ⚠️", "warn"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUri = reader.result;
    input.value = dataUri;
    toast(`"${file.name}" loaded ✅ (${Math.round(file.size/1024)}KB)`, "ok");
  };
  reader.readAsDataURL(file);
}
function closeAf() { afModal.classList.remove("open"); }
afModal.querySelectorAll("[data-afclose]").forEach((el) => el.addEventListener("click", closeAf));

function setPath(o, p, v) {
  const ks = p.split(".");
  const last = ks.pop();
  ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v;
}
document.getElementById("afSave").addEventListener("click", () => {
  const arr = afCtx.type === "proj" ? work.projects : afCtx.type === "skill" ? work.skills : work.timeline;
  const obj = afCtx.idx >= 0 ? arr[afCtx.idx] : { _uid: "n" + Date.now() };
  afModal.querySelectorAll("[data-k]").forEach((inp) => {
    const k = inp.dataset.k;
    if (inp.type === "checkbox") setPath(obj, k, inp.checked);
    else if (k === "cats") setPath(obj, k, inp.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean));
    else setPath(obj, k, inp.value.trim());
  });
  if (afCtx.idx < 0) arr.push(obj);
  touch();
  closeAf();
  afCtx.type === "proj" ? renderAdminProjects() : afCtx.type === "skill" ? renderAdminSkills() : renderAdminTimeline();
  renderDash();
  toast("ثبت شد — یادت نره «ذخیره» رو بزنی 💾", "info");
});

function fillSettings() {
  const c = state.texts.contact || {};
  const s = getSocials();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? "" : String(v); };
  set("sPhone", c.phone); set("sEmail", c.email);
  set("sTg", s.telegram); set("sGh", s.github); set("sIg", s.instagram); set("sYt", s.youtube);
  set("sLeadFa", state.texts.leadFa); set("sLeadEn", state.texts.leadEn);
}
document.getElementById("aSaveSettings").addEventListener("click", () => {
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  cmsData.texts = Object.assign({}, cmsData.texts, {
    contact: { phone: val("sPhone"), email: val("sEmail") },
    socials: {
      telegram: val("sTg").replace(/^@/, ""),
      github: val("sGh"),
      instagram: val("sIg"),
      youtube: val("sYt"),
    },
    leadFa: val("sLeadFa"),
    leadEn: val("sLeadEn"),
  });
  cmsSave();
  renderContact(); renderSocialLinks(); applyDynamicTexts(); applyLang();
  syncServer();
  toast("تنظیمات ذخیره شد ✅", "ok");
});

/* ═══ وضعیت همکاری — رادیو + ذخیره ═══ */
document.querySelectorAll(".av-opt input").forEach((inp) =>
  inp.addEventListener("change", () => {
    document.querySelectorAll(".av-opt").forEach((o) => o.classList.toggle("on", o.querySelector("input").checked));
  }));
document.getElementById("aSaveAvail").addEventListener("click", () => {
  const sel = document.querySelector(".av-opt input:checked");
  if (!sel) { toast("اول یه وضعیت انتخاب کن ⚠️", "warn"); return; }
  store.set(AVAIL_KEY, sel.value);
  applyAvail(sel.value);
  syncServer();
  toast("وضعیت همکاری ذخیره و روی سایت اعمال شد ✅", "ok");
});

/* ═══ رنگ پیش‌فرض سایت در پنل ادمین ═══ */
const adminColorsEl = document.getElementById("adminColors");
if (adminColorsEl) {
  ACCENTS.forEach((a, i) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "sp-swatch";
    sw.style.background = a.c;
    sw.style.width = "32px";
    sw.style.height = "32px";
    sw.title = "Color " + (i + 1);
    sw.addEventListener("click", () => {
      store.set("mehdi-accent", String(i));
      setAccent(i, false);
      document.getElementById("adminColorIdx").value = String(i);
      adminColorsEl.querySelectorAll(".sp-swatch").forEach((s, j) => s.classList.toggle("active", j === i));
      syncServer();
      toast("رنگ پیش‌فرض سایت ذخیره شد ✅", "ok");
    });
    adminColorsEl.appendChild(sw);
  });
  const savedAccentIdx = parseInt(store.get("mehdi-accent") ?? "0", 10);
  adminColorsEl.querySelectorAll(".sp-swatch").forEach((s, j) => s.classList.toggle("active", j === savedAccentIdx));
}

/* ═══ تغییر نام سایت ═══ */
const SITENAME_KEY = "mehdi-site-name";
const siteNameIn = document.getElementById("siteNameIn");
const saveSiteName = document.getElementById("saveSiteName");
if (siteNameIn) {
  siteNameIn.value = store.get(SITENAME_KEY) || SITE.en;
}
if (saveSiteName) saveSiteName.addEventListener("click", () => {
  const name = (siteNameIn.value || "").trim() || "mahdi dev";
  store.set(SITENAME_KEY, name);
  SITE.en = name;
  applyDynamicTexts();
  syncServer();
  toast("نام سایت ذخیره شد ✅", "ok");
});


document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (typeof afModal !== "undefined" && afModal.classList.contains("open")) { closeAf(); return; }
  if (typeof loginModal !== "undefined" && loginModal.classList.contains("open")) { closeLogin(); return; }
  if (typeof adminEl !== "undefined" && adminEl.classList.contains("open")) { closeAdmin(); return; }
  closeAllPanels();
});
function closeAllPanels() {
  toggleSettingsPanel(false);
  if (mobilePanel) mobilePanel.classList.remove("open");
  if (burger) burger.classList.remove("open");
  document.querySelectorAll(".skill-pill.open").forEach((x) => x.classList.remove("open"));
  closeProject(); closeSite();
  if (window.closeTerm) window.closeTerm();
}

const sideToggle = document.getElementById("sideToggle");
if (sideToggle) {
  if (sess.get("mehdi-side") === "closed") document.body.classList.add("side-closed");
  sideToggle.addEventListener("click", () => {
    const closed = document.body.classList.toggle("side-closed");
    sess.set("mehdi-side", closed ? "closed" : "open");
  });
}

applyLang();
initHeroTerm();
setTimeout(playHeroTermIntro, 1450); /* بعد از محو شدن preloader */

/* ═══════════ ⛔ EASTER_EGGS: ترمینال + بابل + کد کونامی ⛔ ═══════════ */
if (EASTER_EGGS) {
  const termModal = document.getElementById("termModal");
  const termWin = termModal.querySelector(".term-win");
  const termOut = document.getElementById("termOut");
  const termIn = document.getElementById("termIn");
  const termTip = document.getElementById("termTip");
  let hist = [], hi = 0;
  const CMDS = ["help","about","skills","projects","ls projects","open trisa","whoami","neofetch","contact","social","theme dark","theme light","color 1","color 2","color 3","color 4","color 5","color 6","color 7","clear","sudo hire-me","exit","bye"];

  function print(text, cls = "") {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = text;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  }
  function printCmd(text) {
    const d = document.createElement("div");
    d.className = "live-cmd";
    d.textContent = text;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  }
  function typeOut(text, cls = "", speed = 13) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    termOut.appendChild(d);
    let i = 0;
    (function step() {
      d.textContent = text.slice(0, ++i);
      termOut.scrollTop = termOut.scrollHeight;
      if (i < text.length) setTimeout(step, speed);
    })();
  }
  function helpText() {
    return t("termHelp");
  }
  function bootSeq() {
    const lines = LANG === "en"
      ? ["[ OK ] init: mehdi.modules ........ done", "[ OK ] connect: mehdi.dev ........ done", "[ OK ] load: coffee .............. ∞", "", "Welcome, guest! Try these: `help` · `about` · `projects` · `open trisa`"]
      : ["[ OK ] init: mehdi.modules ........ done", "[ OK ] connect: mehdi.dev ........ done", "[ OK ] load: coffee .............. ∞", "", "خوش اومدی! امتحان کن: `help` · `about` · `projects` · `open trisa`"];
    let i = 0;
    (function next() {
      if (i >= lines.length) { termIn.focus(); return; }
      const s = lines[i++];
      if (s === "") print("");
      else if (s.startsWith("[")) print(s, "dim");
      else typeOut(s, "ok", 14);
      setTimeout(next, 200);
    })();
  }
  function openTerm() {
    termModal.classList.add("open");
    termTip.classList.remove("show");
    document.body.style.overflow = "hidden";
    if (window.lenis) window.lenis.stop();
    if (!termOut.dataset.boot) { termOut.dataset.boot = "1"; bootSeq(); }
    termIn.focus();
  }
  function closeTerm() {
    termModal.classList.remove("open");
    termWin.classList.remove("term-red");
    document.body.style.overflow = "";
    if (window.lenis) window.lenis.start();
  }
  window.closeTerm = closeTerm;
  document.getElementById("termFab").addEventListener("click", openTerm);
  termModal.querySelectorAll("[data-tclose]").forEach((el) => el.addEventListener("click", closeTerm));
  document.getElementById("termHelpBtn").addEventListener("click", () => print(helpText(), "dim"));

  /* ⬅ بابل پیام: ۳۰ ثانیه اول، بعد هر ۵ دقیقه */
  let tipTimer1 = null, tipTimer2 = null;
  function showTip() {
    if (termModal.classList.contains("open")) return;
    termTip.classList.add("show");
    setTimeout(() => termTip.classList.remove("show"), 7000);
  }
  setTimeout(() => {
    showTip();
    tipTimer2 = setInterval(showTip, 5 * 60 * 1000);
  }, 30000);
  document.getElementById("termFab").addEventListener("click", () => {
    clearTimeout(tipTimer1); clearInterval(tipTimer2);
    termTip.classList.remove("show");
  });

  function redMode() {
    termWin.classList.add("term-red");
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 650);
    const lines = LANG === "en"
      ? ["> validating guest permissions...", "> checking skills database...", "> coffee level: MAXIMUM ☕", "> confidence: 100%", "", "  █████ ACCESS GRANTED ████", "", " $ resume unlocked — enjoy! 😎"]
      : ["> در حال بررسی دسترسی مهمان...", "> بررسی پایگاه مهارت‌ها...", "> سطح قهوه: بیشینه ☕", "> اعتماد به نفس: ۱۰۰٪", "", "  █████ دسترسی کامل داده شد ████", "", " $ رزومه آزاد شد — لذت ببر! 😎"];
    let i = 0;
    (function next() {
      if (i >= lines.length) return;
      const s = lines[i++];
      s ? typeOut(s, "ok", 16) : print("");
      setTimeout(next, 330);
    })();
  }

  function run(raw) {
    const c = raw.trim();
    if (!c) return;
    printCmd(c); /* با $ داخل خروجی */
    const cmd = c.toLowerCase();
    if (cmd === "help") print(helpText(), "dim");
    else if (cmd === "about") typeOut(t("termAbout"), "ok");
    else if (cmd === "skills") state.skills.forEach((s, i) => setTimeout(() => print("• " + L(s.name)), i * 90));
    else if (cmd === "projects" || cmd === "ls projects") state.projects.forEach((p, i) => setTimeout(() => print("• " + L(p.title) + (p.soon ? " (" + t("tagSoon") + ")" : "") + (p.embed ? " [live]" : "")), i * 90));
    else if (cmd === "ls") print("projects/   about/   skills/", "dim");
    else if (cmd === "contact" || cmd === "social") {
      const s = getSocials();
      print("Telegram: " + (s.telegram ? "@" + String(s.telegram).replace(/^@/, "") : "—"), "ok");
      print("GitHub: " + (s.github ? "github.com/" + String(s.github).replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "") : "—"), "ok");
      if (socUrl("instagram", s.instagram)) print("Instagram: " + socUrl("instagram", s.instagram).replace(/^https?:\/\//, ""), "ok");
      if (socUrl("youtube", s.youtube)) print("YouTube: " + socUrl("youtube", s.youtube).replace(/^https?:\/\//, ""), "ok");
    }
    else if (cmd === "neofetch") typeOut([
      "     ██╗   ██╗   mehdi@resume",
      "     ╚██╗ ██╔╝   ───────────────",
      "      ╚████╔╝    OS: MehdiOS 1.0",
      "       ╚██╔╝     Shell: bash",
      "        ██║      Age: 16",
      "        ╚═╝      Role: Full-Stack Dev",
      "                 Uptime: 2+ years",
      "                 Coffee: ∞",
    ].join("\n"), "ok", 4);
    else if (cmd.startsWith("open")) {
      const q = cmd.slice(4).trim();
      const p = state.projects.find((x) => x.embed && (q === "" || L(x.title).toLowerCase().includes(q) || x.embed.includes(q)));
      if (p) { print(t("termOpening")(L(p.title)), "dim"); setTimeout(() => openSite(p), 500); }
      else print(t("termOpenMiss"), "err");
    }
    else if (cmd === "theme dark" || cmd === "theme light") { setMode(cmd.split(" ")[1]); typeOut(t("termTheme")(cmd.split(" ")[1]), "ok"); }
    else if (/^color [1-7]$/.test(cmd)) { const n = +cmd.split(" ")[1] - 1; setAccent(n, true); typeOut(t("termColor")(n + 1), "ok"); }
    else if (cmd === "clear") { termOut.innerHTML = ""; termWin.classList.remove("term-red"); print(t("termClear"), "dim"); }
    else if (cmd === "sudo hire-me" || cmd === "sudo hire me") redMode();
    else if (cmd === "exit" || cmd === "bye") { typeOut(t("termBye"), "dim"); setTimeout(closeTerm, 700); }
    else typeOut(t("termUnknown")(c), "err");
  }
  termIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = termIn.value;
      if (v.trim()) hist.push(v);
      hi = hist.length;
      run(v); termIn.value = "";
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hi > 0) { hi--; termIn.value = hist[hi] || ""; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hi < hist.length - 1) { hi++; termIn.value = hist[hi]; }
      else { hi = hist.length; termIn.value = ""; }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const v = termIn.value.toLowerCase().trim();
      if (!v) return;
      const m = CMDS.filter((c) => c.startsWith(v));
      if (m.length === 1) termIn.value = m[0];
      else if (m.length > 1) print(m.join("   "), "dim");
    }
  });

  const SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let ki = 0;
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === SEQ[ki]) {
      ki++;
      if (ki === SEQ.length) { ki = 0; codeRain(); toast("🎮 کدهای مخفی فعال شد! ☔💻", "ok"); }
    } else {
      ki = k === SEQ[0] ? 1 : 0;
    }
  });
  function codeRain() {
    const box = document.createElement("div");
    box.className = "code-rain";
    const chars = ["💻", "⌨️", "🚀", "</>", "{ }", "☕", "()=>{}", "<div>", "git push", "npm i", "🎯", "✨"];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement("span");
      s.textContent = chars[Math.floor(Math.random() * chars.length)];
      s.style.left = Math.random() * 96 + "vw";
      s.style.fontSize = (Math.random() * 14 + 12) + "px";
      s.style.animationDuration = (Math.random() * 1.8 + 2.2) + "s";
      s.style.animationDelay = (Math.random() * 1.2) + "s";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 5200);
  }
}
/* ═══════ پایان EASTER_EGGS ═══════ */

/* ═══════════════════════════════════════════════
   Lenis — اسکرول نرم و لُکسوری (Smooth Scroll)
   اگه CDN در دسترس نبود، اسکرول عادی مرورگر فعال می‌مونه
   ═══════════════════════════════════════════════ */
(function setupLenis() {
  if (!window.Lenis || mm("(prefers-reduced-motion: reduce)")) return;
  try {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 });
    window.lenis = lenis;
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    if (window.gsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (now) => { lenis.raf(now); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    document.documentElement.style.scrollBehavior = "auto"; /* تداخل با scroll-behavior:smooth مرورگر نداشته باشه */
    window.smoothScrollTo = (target, offset) => {
      const el = typeof target === "string" ? document.querySelector(target) : target;
      if (!el) return;
      if (window.lenis) lenis.scrollTo(el, { offset: offset === undefined ? -76 : offset, duration: 1.2 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    /* لینک‌های داخلی (#) از مسیر نرم لنیس رد بشن */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      a.addEventListener("click", (e) => {
        const el = document.querySelector(href);
        if (el) { e.preventDefault(); smoothScrollTo(el); }
      });
    });
  } catch (err) { console.warn("[Lenis] setup failed:", err.message); }
})();

/* ═══════════════════════════════════════════════
   GSAP + ScrollTrigger — انیمیشن‌های حرفه‌ای، پررنگ و طولانی‌تر
   ⬅ نسخه‌ی مقاوم (بدون باگ «گم شدن بخش‌ها»):
     • عنصرها فقط با gsap.set مخفی می‌شوند و ورودشان با onEnter + once پخش می‌شود
     • clearProps بعد از هر انیمیشن → هاورهای CSS (برجسته شدن) همیشه کار می‌کنند
     • watchdog: هر عنصری که داخل دید است ولی پخش نشده، خودکار پخش می‌شود
       (refresh، رستور اسکرول مرورگر، ریسایز… دیگر هیچ‌چیز را مخفی نمی‌گذارد)
   روی موبایل هم دقیقاً همین‌ها اجرا می‌شود.
   ═══════════════════════════════════════════════ */
(function setupMotion() {
  if (!window.gsap || mm("(prefers-reduced-motion: reduce)")) return;
  try {
    gsap.defaults({ ease: "power3.out" });
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add("gsap");
    /* خنثی‌کردن سیستم reveal قدیمی — از این به بعد انیمیشن‌ها با GSAP اجرا می‌شوند */
    document.querySelectorAll(".reveal").forEach((el) => el.classList.remove("reveal"));
    document.querySelectorAll(".values-list").forEach((el) => el.classList.add("in"));

    /* ⬅ ورود هیرو — شروع بعد از محو شدن preloader؛ حرکت‌های بزرگ‌تر و کشیده‌تر */
    gsap.timeline({ delay: 1.3, defaults: { ease: "power3.out" } })
      .from(".hero .kicker", { y: 36, opacity: 0, duration: 1.0, clearProps: "transform" }, 0)
      .from(".hero h1", { y: 52, opacity: 0, duration: 1.15, clearProps: "transform" }, 0.12)
      .from(".typer-line", { y: 30, opacity: 0, duration: 0.9, clearProps: "transform" }, 0.4)
      .from(".lead", { y: 30, opacity: 0, duration: 0.9, clearProps: "transform" }, 0.52)
      .from(".hero-visual", { y: 60, opacity: 0, scale: .95, duration: 1.25, clearProps: "transform" }, 0.35);

    if (!window.ScrollTrigger) return;
    const dirX = document.documentElement.dir === "rtl" ? 46 : -46;
    const pending = [];
    const reveal = (targets, spec) => {
      const els = typeof targets === "string" ? document.querySelectorAll(targets) : targets;
      if (!els || !els.length) return;
      const list = Array.prototype.slice.call(els);
      const hide = {};
      ["x", "y", "scale", "opacity"].forEach((k) => { if (spec[k] !== undefined) hide[k] = spec[k]; });
      gsap.set(list, hide);
      const trigger = list[0].closest("section") || list[0];
      const tw = gsap.to(list, {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: spec.duration || 1,
        stagger: spec.stagger || 0,
        ease: "power3.out",
        paused: true,
        clearProps: "transform",
      });
      ScrollTrigger.create({ trigger: trigger, start: "top 85%", once: true, onEnter: () => tw.play() });
      pending.push({ tw: tw, trigger: trigger });
    };

    /* تیتر همه‌ی بخش‌ها */
    document.querySelectorAll(".sec-head").forEach((el) => reveal([el], { y: 50, opacity: 0, duration: 1.05 }));

    /* محتوای بخش‌ها — با stagger پلکانی */
    reveal(".filters .tech-btn", { x: dirX, opacity: 0, duration: .7, stagger: .07 });
    reveal("#pIndex .p-row", { y: 50, opacity: 0, duration: .95, stagger: .1 });
    reveal(".skills-wrap .skill-pill", { y: 40, opacity: 0, scale: .93, duration: .85, stagger: .09 });
    reveal(".values-list .value-card", { y: 46, opacity: 0, duration: .95, stagger: .1 });
    /* تایم‌لاین: فقط y — تا خط عمودی هیچ‌وقت از نقطه‌ها جدا نشود */
    reveal(".timeline .tl-item", { y: 44, opacity: 0, duration: 1.0, stagger: .14 });
    reveal(".about-stats .gcard", { y: 36, scale: .92, opacity: 0, duration: .9, stagger: .1 });
    reveal(".avail-card", { y: 46, opacity: 0, scale: .97, duration: 1.1 });
    reveal(".contact-grid .c-card", { y: 40, opacity: 0, duration: .95, stagger: .12 });

    /* ⬅ نگهبان: تریگری که به هر دلیلی جا افتاد، داخل دید پخش می‌شود */
    const watchdog = setInterval(() => {
      let alive = false;
      pending.forEach((p) => {
        if (!p.tw.paused()) return;
        const r = p.trigger.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) p.tw.play();
        else alive = true;
      });
      if (!alive) clearInterval(watchdog);
    }, 600);
    setTimeout(() => clearInterval(watchdog), 25000);

    /* بعد از لود کامل فونت‌ها، موقعیت‌های اسکرول تازه شود */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  } catch (err) { console.warn("[GSAP] setup failed:", err.message); }
})();

/* ═══════════════════════════════════════════════
   barba.js — گذار نرم بین صفحات (PJAX)
   سایت فعلاً تک‌صفحه‌ایه؛ تا وقتی صفحه‌ی دوم با
   data-barba="wrapper" اضافه نشه، کاملاً غیرفعال می‌مونه
   ═══════════════════════════════════════════════ */
(function setupBarba() {
  if (!window.barba) return;
  try {
    if (!document.querySelector('[data-barba="wrapper"]')) return;
    barba.init({
      timeout: 7000,
      transitions: [{
        name: "fade",
        leave({ current }) {
          return window.gsap ? gsap.to(current.container, { opacity: 0, duration: .3 }).then(() => {}) : Promise.resolve();
        },
        enter({ next }) {
          if (window.gsap) gsap.fromTo(next.container, { opacity: 0 }, { opacity: 1, duration: .35 });
          return Promise.resolve();
        },
      }],
    });
  } catch (err) { console.warn("[barba] setup failed:", err.message); }
})();

/* ═══ اتصال به بک‌اند PHP — اگر api.php روی هاست کنار همین فایل باشد، محتوا/آمار/تنظیمات از سرور خوانده و ذخیره می‌شود؛ در غیر این صورت همه‌چیز آفلاین با localStorage کار می‌کند ═══ */
apiBoot();
