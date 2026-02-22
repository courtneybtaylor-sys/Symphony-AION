export default function Billing() {
  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-2">Billing</h1>
        <p className="text-muted-foreground mb-8">Manage your subscription and usage</p>
        
        <div className="space-y-6">
          <div className="bg-secondary/10 border border-accent/20 rounded-lg p-6">
            <h3 className="text-accent font-mono font-bold mb-4">Current Plan</h3>
            <p className="text-foreground">Free Trial - $0/month</p>
            <p className="text-muted-foreground text-sm mt-2">Unlimited API calls during trial period</p>
          </div>
          
          <div className="bg-secondary/10 border border-accent/20 rounded-lg p-6">
            <h3 className="text-accent font-mono font-bold mb-4">Usage This Month</h3>
            <p className="text-foreground">0 / Unlimited</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="bg-accent h-2 rounded-full" style={{width: '0%'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
