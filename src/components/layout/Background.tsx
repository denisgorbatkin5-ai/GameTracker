export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(139,92,246,0.16),transparent_60%)]" />
      <div className="animate-aurora absolute -top-[30%] -left-[15%] size-[70vw] rounded-full bg-violet-600/18 blur-[140px]" />
      <div className="animate-aurora absolute top-[10%] -right-[20%] size-[55vw] rounded-full bg-cyan-500/12 blur-[150px] [animation-delay:-8s]" />
      <div className="animate-aurora absolute bottom-[-25%] left-[20%] size-[50vw] rounded-full bg-pink-500/10 blur-[150px] [animation-delay:-15s]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(6,6,12,0.5))]" />
    </div>
  );
}
