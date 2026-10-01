import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Primitives';

export function NotFound() {
  return (
    <PageShell className="flex min-h-[70vh] items-center justify-center">
      <EmptyState
        icon={<Compass className="size-6" />}
        title="404 — такой страницы нет"
        description="Похоже, ты ушёл в другую вселенную. Вернись на главную или в свою коллекцию."
        action={
          <div className="flex gap-2">
            <Link to="/">
              <Button>На главную</Button>
            </Link>
            <Link to="/collection">
              <Button variant="secondary">Коллекция</Button>
            </Link>
          </div>
        }
      />
    </PageShell>
  );
}
