"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Plus, X,User,CalendarDays,LayoutGrid,LogOut } from "lucide-react";
import {useAccount} from '@/components/account-provider';
import { offerings } from "@/lib/offerings";
import { Button } from "@/components/ui/button";
export function SiteHeader() {
  const pathname = usePathname();
  const {user,logout}=useAccount();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 30);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    function close(e: PointerEvent) {
      if (!header.current?.contains(e.target as Node)) setOpen(null);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  const transparent = pathname === "/" && !scrolled && !mobile;
  return (
    <header
      ref={header}
      className={`hc-header ${transparent ? "hc-header-light" : ""} ${user?'hc-header-auth':''}`}
    >
      <nav className="hc-nav" aria-label="Main navigation">
        <Link href="/" className="hc-brand" aria-label="Buildora home">
          <img src="/brand.svg" alt="Buildora" />
        </Link>
        <div className="hc-desktop-nav">
          {user?<><Link href="/programs" className={pathname==='/programs'?'hc-nav-current':''}>All Programs</Link><Link href="/profile" className={pathname==='/profile'?'hc-nav-current':''}>Profile</Link><Link href="/my-events" className={pathname.startsWith('/my-events')?'hc-nav-current':''}>My Programs</Link></>:<>
          <Link href="/programs">Programs</Link>
          <div
            className="hc-menu-parent"
            onMouseEnter={() => setOpen("offerings")}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              aria-expanded={open === "offerings"}
              aria-controls="offerings-menu"
              onClick={() => setOpen(open === "offerings" ? null : "offerings")}
            >
              Offerings
              <ChevronDown size={15} />
            </button>
            {open === "offerings" && (
              <div className="hc-mega-menu" id="offerings-menu">
                <div>
                  <span>EXTERNAL</span>
                  {offerings.slice(0, 3).map((o) => (
                    <Link key={o.slug} href={"/offerings/" + o.slug}>
                      <strong>{o.name}</strong>
                      <p>{o.description}</p>
                    </Link>
                  ))}
                </div>
                <div>
                  <span>INTERNAL</span>
                  {offerings.slice(3).map((o) => (
                    <Link key={o.slug} href={"/offerings/" + o.slug}>
                      <strong>{o.name}</strong>
                      <p>{o.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div
            className="hc-menu-parent"
            onMouseEnter={() => setOpen("involved")}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              aria-expanded={open === "involved"}
              aria-controls="involved-menu"
              onClick={() => setOpen(open === "involved" ? null : "involved")}
            >
              Get Involved
              <ChevronDown size={15} />
            </button>
            {open === "involved" && (
              <div className="hc-small-menu" id="involved-menu">
                <a
                  href="/host"
                  target="_blank"
                  rel="noreferrer"
                >
                  Book a Call
                </a>
                <Link href="/host">Sales Inquiry</Link>
                <a
                  href="/programs"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Ecosystem
                </a>
              </div>
            )}
          </div>
          </>}
        </div>
        <div className="hc-nav-actions">
          <Button asChild size="sm">
            <Link href="/host">
              <Plus size={17} />
              <span>Host</span>
            </Link>
          </Button>
          {user?<div className="hc-user-control"><button className="hc-avatar-trigger" aria-label="Account menu" aria-expanded={open==='account'} onClick={()=>setOpen(open==='account'?null:'account')}><span>{user.fullName.split(' ').slice(0,2).map(s=>s[0]).join('')}</span><ChevronDown size={19}/></button>{open==='account'&&<div className="hc-user-menu"><div><small>Signed in as</small><strong>{user.fullName}</strong></div><Link href="/profile"><User size={16}/>Profile</Link><Link href="/my-events"><CalendarDays size={16}/>My Programs</Link><Link href="/programs"><LayoutGrid size={16}/>All Programs</Link><Link href="/host"><Plus size={16}/>Host Event</Link><button onClick={logout}><LogOut size={16}/>Logout</button></div>}</div>:<Button asChild size="sm"><Link href="/auth">Sign In</Link></Button>}
          <button
            className={`hc-mobile-toggle ${user?'hc-hide':''}`}
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
      {mobile && (
        <nav className="hc-mobile-nav" aria-label="Mobile navigation">
          <Link href="/programs">Programs</Link>
          <button
            onClick={() => setOpen(open === "offerings" ? null : "offerings")}
            aria-expanded={open === "offerings"}
          >
            Offerings
            <ChevronDown size={16} />
          </button>
          {open === "offerings" && (
            <div>
              {offerings.map((o) => (
                <Link key={o.slug} href={"/offerings/" + o.slug}>
                  {o.name}
                </Link>
              ))}
              <Link href="/offerings">All Offerings</Link>
            </div>
          )}
          <button
            onClick={() => setOpen(open === "involved" ? null : "involved")}
            aria-expanded={open === "involved"}
          >
            Get Involved
            <ChevronDown size={16} />
          </button>
          {open === "involved" && (
            <div>
              <a
                href="/host"
                target="_blank"
                rel="noreferrer"
              >
                Book a Call
              </a>
              <Link href="/host">Sales Inquiry</Link>
              <a href="/programs">Join Ecosystem</a>
            </div>
          )}
          <Link href="/our-clientele">Our Clients</Link>
          <Link href="/blog">Blogs</Link>
        </nav>
      )}
    </header>
  );
}
