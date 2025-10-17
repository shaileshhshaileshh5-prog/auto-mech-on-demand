import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  selected: boolean;
  onClick: () => void;
}

const ServiceCard = ({ icon: Icon, title, selected, onClick }: ServiceCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
        <Icon className={`h-8 w-8 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-sm font-medium text-center ${selected ? 'text-primary' : ''}`}>
          {title}
        </p>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
