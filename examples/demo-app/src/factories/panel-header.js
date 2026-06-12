// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import {PanelHeaderFactory, Icons} from '@kepler.gl/components';
import {BUG_REPORT_LINK, USER_GUIDE_DOC} from '@kepler.gl/constants';
import React from 'react';
import styled from 'styled-components';

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding-left: 8px;
`;

const BrandTitle = styled.div`
  color: ${props => props.theme.labelColor || '#2473bd'};
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
`;

const BrandVersion = styled.div`
  color: ${props => props.theme.subtextColor || '#6a7485'};
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
`;

const MapsAnalyticsHeader = () => (
  <Brand>
    <BrandTitle>Maps Analytics</BrandTitle>
    <BrandVersion>2.0.0</BrandVersion>
  </Brand>
);

export function CustomPanelHeaderFactory(...deps) {
  const PanelHeader = PanelHeaderFactory(...deps);
  const defaultActionItems = PanelHeader.defaultProps.actionItems;
  PanelHeader.defaultProps = {
    ...PanelHeader.defaultProps,
    logoComponent: MapsAnalyticsHeader,
    actionItems: [
      {
        id: 'bug',
        iconComponent: Icons.Bug,
        href: BUG_REPORT_LINK,
        blank: true,
        tooltip: 'Bug Report',
        onClick: () => {}
      },
      {
        id: 'docs',
        iconComponent: Icons.Docs2,
        href: USER_GUIDE_DOC,
        blank: true,
        tooltip: 'User Guide',
        onClick: () => {}
      },
      defaultActionItems.find(item => item.id === 'storage'),
      {
        ...defaultActionItems.find(item => item.id === 'save'),
        label: null,
        tooltip: 'Share'
      }
    ]
  };
  return PanelHeader;
}

CustomPanelHeaderFactory.deps = PanelHeaderFactory.deps;

export function replacePanelHeader() {
  return [PanelHeaderFactory, CustomPanelHeaderFactory];
}
