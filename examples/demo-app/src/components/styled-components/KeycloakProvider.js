import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {LoadingSpinner, Button} from '@kepler.gl/components';
import keycloak from './keycloak-config';

const CenterWrapper = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 48px;
  background: ${props => props.theme.sidePanelBg || '#242730'};
`;

const Message = styled.p`
  color: ${props => props.theme.textColor || '#7a7a7a'};
  font-size: 14px;
  margin: 0;
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.errorColor || '#ff4d4d'};
  font-size: 14px;
  margin: 0;
`;

// In local dev mode, skip Keycloak auth to avoid redirect loops.
const isLocalDev = NODE_ENV === 'local';

const KeycloakProvider = ({children}) => {
  const [authenticated, setAuthenticated] = useState(isLocalDev ? true : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!isLocalDev);

  useEffect(() => {
    if (isLocalDev) return;
    keycloak
      .init({onLoad: 'login-required', checkLoginIframe: false})
      .then(auth => {
        setAuthenticated(auth);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        // eslint-disable-next-line no-console
        console.error('Keycloak initialization error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <CenterWrapper>
        <LoadingSpinner size={48} />
        <Message>Accediendo a la aplicación de mapas</Message>
      </CenterWrapper>
    );
  }

  if (error) {
    return (
      <CenterWrapper>
        <ErrorMessage>Error: No se pudo autenticar</ErrorMessage>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </CenterWrapper>
    );
  }

  if (authenticated === false) {
    return (
      <CenterWrapper>
        <ErrorMessage>Error: No se pudo autenticar</ErrorMessage>
      </CenterWrapper>
    );
  }

  return <>{children}</>;
};

export default KeycloakProvider;
