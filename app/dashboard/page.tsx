export default function Dashboard() {
  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Welcome to Symphony AION v{process.env.NEXT_PUBLIC_AION_VERSION}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-secondary/10 border border-accent/20 rounded-lg p-6">
            <h3 className="text-accent font-mono font-bold mb-2">Active Models</h3>
            <p className="text-2xl font-bold text-foreground">0</p>
          </div>
          <div className="bg-secondary/10 border border-accent/20 rounded-lg p-6">
            <h3 className="text-accent font-mono font-bold mb-2">Total Requests</h3>
            <p className="text-2xl font-bold text-foreground">0</p>
          </div>
          <div className="bg-secondary/10 border border-accent/20 rounded-lg p-6">
            <h3 className="text-accent font-mono font-bold mb-2">Status</h3>
            <p className="text-2xl font-bold text-green-400">Operational</p>
          </div>
        </div>
      </div>
    </div>
  )
}
