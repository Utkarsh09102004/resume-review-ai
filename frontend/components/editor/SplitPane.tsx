"use client";

import { type ReactNode, useCallback } from "react";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultSize?: number;
}

export default function SplitPane({
  left,
  right,
  defaultSize = 50,
}: SplitPaneProps) {
  const groupRef = useGroupRef();

  const handleDoubleClick = useCallback(() => {
    groupRef.current?.setLayout({ left: 50, right: 50 });
  }, [groupRef]);

  return (
    <Group
      groupRef={groupRef}
      orientation="horizontal"
      className="h-full w-full"
      defaultLayout={{ left: defaultSize, right: 100 - defaultSize }}
    >
      <Panel id="left" minSize="30%" maxSize="70%">
        {left}
      </Panel>

      <Separator
        className="w-1 bg-bg-border transition-colors hover:bg-accent-amber"
        onDoubleClick={handleDoubleClick}
      />

      <Panel id="right" minSize="30%" maxSize="70%">
        {right}
      </Panel>
    </Group>
  );
}
