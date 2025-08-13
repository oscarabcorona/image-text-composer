import { useRef, useEffect } from 'react';
import { ServiceProvider } from '@/lib/editor/services/ServiceProvider';
import { CommandFactory } from '@/lib/editor/commands/CommandFactory';

/**
 * Hook to manage editor services lifecycle
 * Following Single Responsibility - manages service initialization and cleanup
 */
export function useEditorServices() {
  const servicesRef = useRef<ServiceProvider | null>(null);
  const commandFactoryRef = useRef<CommandFactory | null>(null);

  // Initialize services once
  if (!servicesRef.current) {
    servicesRef.current = new ServiceProvider();
    commandFactoryRef.current = new CommandFactory(servicesRef.current);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (servicesRef.current) {
        servicesRef.current.dispose();
        servicesRef.current = null;
        commandFactoryRef.current = null;
      }
    };
  }, []);

  return {
    services: servicesRef.current,
    commandFactory: commandFactoryRef.current!,
  };
}