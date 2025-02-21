import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, ArrowDownCircle } from "lucide-react";

const withdrawRequests = [
  { id: 1, amount: 100, status: "ready", solAmount: 1.5 },
  { id: 2, amount: 200, status: "pending", solAmount: 3.0 },
  { id: 3, amount: 150, status: "claimed", solAmount: 2.25 },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case "claimed":
      return <ArrowDownCircle className="h-5 w-5 text-blue-500" />;
    default:
      return null;
  }
}

export default function Portfolio() {
  return (
    <div className="container mx-auto max-w-4xl py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Your Portfolio</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">$MEME Balance</p>
              <p className="text-2xl font-bold">1,000 $MEME</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated SOL Value</p>
              <p className="text-2xl font-bold">10 SOL</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>SOL + Yield</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <StatusIcon status={request.status} />
                      <span className="ml-2 capitalize">{request.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{request.amount} $MEME</TableCell>
                  <TableCell>{request.solAmount} SOL</TableCell>
                  <TableCell>{request.status === "ready" && <Button size="sm">Claim</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 