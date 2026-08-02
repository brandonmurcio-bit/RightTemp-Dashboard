import { useParams } from "wouter";

export default function JobDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Job #{id}
        </h1>

        <p className="text-muted-foreground mt-2">
          Installation workspace
        </p>
      </div>
    </div>
  );
}