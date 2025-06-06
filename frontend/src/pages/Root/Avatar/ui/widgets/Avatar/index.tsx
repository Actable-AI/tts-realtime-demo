/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable i18next/no-literal-string */
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Layout = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyleVideo = styled.div`
  width: 300px;
  height: 300px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;

  img {
    margin-top: -2px;
    margin-left: -2px;
  }

  video {
    height: 320px;
    width: 320px;
    transition: opacity 0.3s ease;
    position: absolute;
    top: -10px;
    left: -10px;
  }
`;
const GradientRingWrap = styled.div`
  width: 326px;
  height: 326px;
  position: absolute;
  overflow: hidden;
`;

const GradientRing = styled.div`
  width: 310px;
  height: 310px;
  margin-top: 8px;
  margin-left: 8px;
  border-radius: 50%;
  background: conic-gradient(var(--primary-color), var(--secondary-inverted-color), var(--primary-color));
  filter: blur(4px) brightness(1.1);
  animation: spin 3s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Avatar = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }, []);

  return (
    <>
      <Layout>
        <GradientRingWrap>
          <GradientRing />
        </GradientRingWrap>

        <StyleVideo>
          <img src='/avatar.png' alt='' />

          <video ref={videoRef} src='/live-interpreter-loop.mp4' autoPlay muted loop playsInline />
        </StyleVideo>
      </Layout>
    </>
  );
};

export { Avatar };
