import React from 'react';
import {TippyTooltip} from '@kepler.gl/components';

// Replica el MapControlTooltip de kepler (placement="left") con texto plano,
// para usar el mismo tooltip estilizado en los botones custom.
export default function ControlTooltip({id, label, children}) {
  return (
    <TippyTooltip placement="left" render={() => <div id={id}>{label}</div>}>
      {children}
    </TippyTooltip>
  );
}
