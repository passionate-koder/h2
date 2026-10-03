"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="market-page"><div className="market-empty"><h1>We couldn’t load opportunities</h1><p>Please try again.</p><button className="market-button" onClick={reset}>Retry</button></div></main>; }
