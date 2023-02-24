import { css } from '@emotion/css';
import React, { useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, VerticalGroup, Dropdown, Menu, HorizontalGroup, useTheme2, Select, Slider, Field } from '@grafana/ui';
import appEvents from 'app/core/app_events';

const effectsOptions: Array<SelectableValue<string>> = [{ value: 'snow', label: 'Snow' }];

export const EffectsToolBar = () => {
  const [selectedEffect, setSelectedEffect] = useState('snow');
  const [particlesNumber, setparticlesNumber] = useState(5000);
  const [speed, setSpeed] = useState(1);
  const [wind, setWind] = useState(0.05);
  const theme = useTheme2();
  const styles = getStyles(theme);

  const onStart = () => {
    appEvents.emit('visual-effect-start', { particlesNumber, speed });
  };

  const onStop = () => {
    appEvents.emit('visual-effect-cancel');
  };

  const onMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const snowControls = (
    <div className={styles.effectControls}>
      <Field label="Particles" description={particlesNumber} className={styles.label}>
        <Slider
          min={100}
          max={20000}
          step={100}
          value={particlesNumber}
          onChange={(val) => setparticlesNumber(val)}
          marks={{ 1000: '.', 5000: '.', 10000: '.' }}
        />
      </Field>
      <Field label="Speed" className={styles.label}>
        <Slider
          min={0.1}
          max={10}
          step={0.1}
          value={speed}
          onChange={(val) => setSpeed(val)}
          marks={{ 1: '.', 5: '.', 10: '.' }}
        />
      </Field>
      <Field label="Wind" className={styles.label}>
        <Slider min={0} max={1} step={0.05} value={wind} onChange={(val) => setWind(val)} />
      </Field>
    </div>
  );

  const menu = (
    <Menu onClick={onMenuClick}>
      <div className={styles.menuWrapper}>
        <VerticalGroup>
          <HorizontalGroup>
            <Select
              width={20}
              options={effectsOptions}
              value={selectedEffect}
              onChange={(option) => setSelectedEffect(option.value || 'snow')}
            />
            <Button size="sm" variant="secondary" onClick={() => onStart()}>
              Start
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onStop()}>
              Stop
            </Button>
          </HorizontalGroup>
          {selectedEffect === 'snow' && snowControls}
        </VerticalGroup>
      </div>
    </Menu>
  );

  return (
    <Dropdown overlay={menu}>
      <Button icon="gf-glue" variant="secondary" fill="text" />
    </Dropdown>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  menuWrapper: css({
    padding: theme.spacing(1),
    minWidth: '350px',
  }),
  effectControls: css`
    width: 100%;
  `,
  label: css`
    width: 100%;
  `,
});
