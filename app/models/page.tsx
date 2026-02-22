export default function Models() {
  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-2">Models</h1>
        <p className="text-muted-foreground mb-8">Manage and monitor AI models in your control plane</p>
        
        <div className="bg-secondary/10 border border-accent/20 rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No models deployed yet</p>
          <button className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors font-mono font-bold">
            Deploy Model
          </button>
        </div>
      </div>
    </div>
  )
}
