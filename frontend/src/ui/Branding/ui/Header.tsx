import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AudioOutlined,
  GlobalOutlined,
  MutedOutlined,
  SettingOutlined,
  SoundOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { routesForRedirect } from '@app/configs/router';
import { useGetUserInfoQuery } from '@modules/Auth/api';
import { ChangeLanguage } from '@modules/Language/ui/widgets/changeLanguage';
import { useSpeechToTextContext } from '@modules/Recording';
import { ChangeLanguageEnum } from '@modules/Recording/enums/status';
import useMicrophoneStatus from '@modules/Recording/ui/widgets/Recording/useMicrophoneStatus';
import { logout } from '@shared/api/generated/endpoints';
import { getUserUsage } from '@shared/api/user/endpoints';
import { FREE_USER_USAGE_ENUM, MONOLOGUE_ENUM, SPEECH_ONLY_ENUM } from '@shared/constants';
import { useUtilsContext } from '@shared/contexts/utils';
import { useMutation } from '@tanstack/react-query';
import { ChooseMic } from '@ui/Branding/ui/ChooseMic';
import { Notification } from '@ui/Branding/ui/Notification';
import { Avatar, Button, Dropdown, Tooltip } from 'antd';
import styled from 'styled-components';

const isChangeLanguage = import.meta.env.VITE_AZURE_CHANGE_LANGUAGE_FLAG === ChangeLanguageEnum.ON;
const isFreeUserUsage = import.meta.env.VITE_FREE_USER_USAGE_FLAG === FREE_USER_USAGE_ENUM.ON;
const isMonologue = import.meta.env.VITE_MONOLOGUE_FLAG === MONOLOGUE_ENUM.ON;
const isSpeechOnly = import.meta.env.VITE_SPEECH_ONLY_FLAG === SPEECH_ONLY_ENUM.ON;

const HeaderContainer = styled.div`
  position: relative;
  z-index: var(--header-z-index);
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 20px;
  gap: 20px;
`;

const AvatarContainer = styled.div`
  padding: 4px;
  border-radius: 50%;
  width: 40px;
  height: 40px;

  &:hover {
    background-color: rgba(60, 64, 67, 0.08);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

const LabelDropdownContainer = styled.div`
  font-size: 14px;
`;

const IconDialogue = styled.img`
  width: 18px;
  height: 18px;
  object-fit: cover;
`;

function Header() {
  const navigate = useNavigate();

  const { isSilentMode, setIsSilentMode, isDialogue, setIsDialogue } = useUtilsContext();

  const { isDisabledAction, isLanguageDisabled, stopRecording } = useSpeechToTextContext();

  const { isMicActive, isEchoCancellation, handleCheckEchoCancellation } = useMicrophoneStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isOpenLanguage, setIsOpenLanguage] = useState(false);
  const [isOpenChooseMic, setIsOpenChooseMic] = useState(false);

  const { data: userInfo } = useGetUserInfoQuery();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: (res) => {
      if (res) {
        stopRecording();
        navigate(routesForRedirect.signIn);
      }
    },
    onError: () => {},
  });

  const handleLogout = () => {
    logoutMutation.mutate({});
  };

  const getUserUsageMutation = useMutation({
    mutationFn: getUserUsage,
    onSuccess: (res) => {
      if (!res) handleLogout();
    },
    onError: () => {},
  });

  const handleGetUserUsage = () => getUserUsageMutation.mutate({});

  useEffect(() => {
    if (!userInfo?.email || !isFreeUserUsage) return;

    handleGetUserUsage();

    const interval = setInterval(handleGetUserUsage, 60000);
    return () => clearInterval(interval);
  }, [userInfo?.email]);

  const items = [
    {
      key: '1',
      label: <LabelDropdownContainer>Account</LabelDropdownContainer>,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      label: <LabelDropdownContainer>{userInfo?.email}</LabelDropdownContainer>,
    },
    {
      type: 'divider',
    },
    {
      key: '4',
      label: <LabelDropdownContainer onClick={handleLogout}>Logout</LabelDropdownContainer>,
    },
  ];

  const handleChangeMode = () => {
    setIsSilentMode(!isSilentMode);
    setNotificationTitle('Silent mode');
    setNotificationMessage('ON');
    if (isSilentMode) setNotificationMessage('OFF');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const handleChangeDialogue = async () => {
    // if (isMicActive && !isEchoCancellation) return;

    // const isCheck = await handleCheckEchoCancellation();
    // if (!isCheck) {
    //   notification.info({ message: 'This browser is not supported.' });
    //   return;
    // }

    setIsDialogue(!isDialogue);
    setIsSilentMode(false);
    setNotificationTitle('Monologue');
    setNotificationMessage('OFF');
    setIsOpen(true);

    if (!isDialogue) {
      setNotificationMessage('ON');
      setIsSilentMode(true);
    }
  };

  const itemsSetting = [
    ...(isChangeLanguage
      ? [
          {
            key: 'changeLanguage',
            label: <LabelDropdownContainer>Language</LabelDropdownContainer>,
            icon: <GlobalOutlined />,
            disabled: isLanguageDisabled,
          },
          { type: 'divider' },
        ]
      : []),
    {
      key: 'chooseMicrophone',
      label: <LabelDropdownContainer>Choose microphone</LabelDropdownContainer>,
      icon: <AudioOutlined />,
    },
  ];

  const handleSettingClick = ({ key }) => {
    switch (key) {
      case 'changeLanguage':
        if (!isLanguageDisabled) setIsOpenLanguage(true);
        break;
      case 'chooseMicrophone':
        setIsOpenChooseMic(true);
        break;
      default:
        break;
    }
  };

  return (
    <HeaderContainer>
      {isMonologue ? (
        <Tooltip title={isMicActive ? (isEchoCancellation ? null : 'This browser is not supported.') : null}>
          <Button
            shape='circle'
            icon={<IconDialogue src={isDialogue ? '/monologueIcon.png' : '/dialogueIcon.png'} alt='' />}
            onClick={handleChangeDialogue}
            disabled={isDisabledAction}
          />
        </Tooltip>
      ) : null}

      {isSpeechOnly ? (
        <Button
          shape='circle'
          icon={isSilentMode ? <MutedOutlined /> : <SoundOutlined />}
          onClick={handleChangeMode}
          disabled={isDialogue}
        />
      ) : null}

      {isOpen ? (
        <Notification
          isOpen={true}
          onCancel={handleCancel}
          title={notificationTitle}
          message={notificationMessage}
        />
      ) : null}

      <Dropdown menu={{ items: itemsSetting, onClick: handleSettingClick }} arrow>
        <Button shape='circle' icon={<SettingOutlined />} />
      </Dropdown>

      {userInfo?.email ? (
        <Dropdown menu={{ items }}>
          <AvatarContainer>
            {userInfo?.picture ? <img src={userInfo.picture} alt='' /> : <Avatar icon={<UserOutlined />} />}
          </AvatarContainer>
        </Dropdown>
      ) : (
        <Link to='/signin'>
          <Button type={'primary'}>Login</Button>
        </Link>
      )}

      {isChangeLanguage && isOpenLanguage ? (
        <ChangeLanguage isOpen={isOpenLanguage} onCancel={() => setIsOpenLanguage(false)} />
      ) : null}

      {isOpenChooseMic ? (
        <ChooseMic isOpen={isOpenChooseMic} onCancel={() => setIsOpenChooseMic(false)} />
      ) : null}
    </HeaderContainer>
  );
}

export { Header };
