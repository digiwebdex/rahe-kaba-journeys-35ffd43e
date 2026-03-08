import { useState, useMemo } from "react";
import { Calculator, Plus, Trash2, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CostItem {
  id: string;
  description: string;
  unitPrice: number;
}

const DEFAULT_ITEMS: CostItem[] = [
  { id: "1", description: "টিকেট (Ticket)", unitPrice: 0 },
  { id: "2", description: "ভিসা (Visa)", unitPrice: 0 },
  { id: "3", description: "মক্কা হোটেল (Makkah Hotel)", unitPrice: 0 },
  { id: "4", description: "মদিনা হোটেল (Madina Hotel)", unitPrice: 0 },
  { id: "5", description: "খাবার (Food)", unitPrice: 0 },
  { id: "6", description: "পানি খরচ (Water)", unitPrice: 0 },
  { id: "7", description: "নাস্তা খরচ (Breakfast)", unitPrice: 0 },
  { id: "8", description: "ফল/ফ্রুট খরচ (Fruits)", unitPrice: 0 },
  { id: "9", description: "অন্যান্য খরচ (Misc)", unitPrice: 0 },
];

const fmt = (n: number) => `৳${n.toLocaleString("en-IN")}`;

export default function AdminCalculatorPage() {
  const [groupName, setGroupName] = useState("মার্চ মাসের ওমরাহ গ্রুপ");
  const [groupDate, setGroupDate] = useState("");
  const [totalHajji, setTotalHajji] = useState(68);
  const [sellingPricePerPerson, setSellingPricePerPerson] = useState(0);
  const [items, setItems] = useState<CostItem[]>(DEFAULT_ITEMS);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof CostItem, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const costPerPerson = useMemo(() => items.reduce((s, i) => s + Number(i.unitPrice || 0), 0), [items]);
  const totalCost = costPerPerson * totalHajji;
  const profitPerPerson = sellingPricePerPerson - costPerPerson;
  const totalProfit = profitPerPerson * totalHajji;
  const totalRevenue = sellingPricePerPerson * totalHajji;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          গ্রুপ খরচ ক্যালকুলেটর
        </h1>
      </div>

      {/* Group Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">গ্রুপ তথ্য</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">গ্রুপের নাম</Label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="গ্রুপের নাম" />
          </div>
          <div>
            <Label className="text-xs">তারিখ</Label>
            <Input type="date" value={groupDate} onChange={e => setGroupDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">মোট হাজী সংখ্যা</Label>
            <Input type="number" value={totalHajji || ""} onChange={e => setTotalHajji(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Cost Items */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">জন প্রতি খরচ (Per Person Cost)</h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> আইটেম যোগ করুন
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground tracking-wider px-1">
            <div className="col-span-1">#</div>
            <div className="col-span-6">বিবরণ</div>
            <div className="col-span-3">জন প্রতি মূল্য (৳)</div>
            <div className="col-span-2 text-right">মোট (৳)</div>
          </div>

          {items.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-secondary/20 rounded-lg p-2">
              <div className="col-span-1 text-xs text-muted-foreground">{idx + 1}</div>
              <div className="col-span-6">
                <Input
                  value={item.description}
                  onChange={e => updateItem(item.id, "description", e.target.value)}
                  placeholder="খরচের বিবরণ"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={item.unitPrice || ""}
                  onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-sm font-medium">{fmt(Number(item.unitPrice || 0) * totalHajji)}</span>
                <button onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive ml-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Per person total */}
          <div className="border-t border-border pt-3 mt-2 grid grid-cols-12 gap-2 px-1">
            <div className="col-span-7 text-sm font-bold">জন প্রতি মোট খরচ</div>
            <div className="col-span-3 text-sm font-bold text-destructive">{fmt(costPerPerson)}</div>
            <div className="col-span-2 text-sm font-bold text-destructive text-right">{fmt(totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Selling Price & Profit */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">প্যাকেজ মূল্য ও লাভ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs">জন প্রতি প্যাকেজ বিক্রয় মূল্য (৳)</Label>
            <Input
              type="number"
              value={sellingPricePerPerson || ""}
              onChange={e => setSellingPricePerPerson(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-primary/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          📊 চূড়ান্ত হিসাব ({groupName})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">মোট হাজী</p>
            <p className="text-lg font-bold text-foreground">{totalHajji} জন</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">জন প্রতি খরচ</p>
            <p className="text-lg font-bold text-destructive">{fmt(costPerPerson)}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">জন প্রতি বিক্রয়</p>
            <p className="text-lg font-bold text-primary">{fmt(sellingPricePerPerson)}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">জন প্রতি লাভ</p>
            <p className={`text-lg font-bold ${profitPerPerson >= 0 ? "text-green-500" : "text-destructive"}`}>{fmt(profitPerPerson)}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">মোট খরচ ({totalHajji} জন × {fmt(costPerPerson)})</span>
            <span className="font-bold text-destructive">{fmt(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">মোট বিক্রয় ({totalHajji} জন × {fmt(sellingPricePerPerson)})</span>
            <span className="font-bold text-primary">{fmt(totalRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-bold">মোট মুনাফা ({totalHajji} জন × {fmt(profitPerPerson)})</span>
            <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-500" : "text-destructive"}`}>{fmt(totalProfit)}</span>
          </div>
        </div>

        {totalProfit > 0 && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">আলহামদুলিল্লাহ — মোট মুনাফা</p>
            <p className="text-2xl font-bold text-green-500">{fmt(totalProfit)}</p>
          </div>
        )}

        {sellingPricePerPerson > 0 && (
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            বিঃদ্রঃ এই হিসাব শুধুমাত্র অনুমান। প্রকৃত খরচ ভিন্ন হতে পারে।
          </p>
        )}
      </div>
    </div>
  );
}
