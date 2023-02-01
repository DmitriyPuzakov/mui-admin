import SaveIcon from '@mui/icons-material/Save';
import { Box, MenuItem, Typography } from '@mui/material';
import HoverMenu from 'material-ui-popup-state/HoverMenu';
import {
  usePopupState,
  bindHover,
  bindMenu,
} from 'material-ui-popup-state/hooks';
import { ExitToApp } from 'mdi-material-ui';
import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import Form from 'form/Form';
import { type FormElementRef } from 'form/Form.types';
import { FormFetcher } from 'form/contexts/FormFetcherContext';
import { FormSubmitter } from 'form/contexts/FormSubmitterContext';
import { DirtyStateListener } from 'form/core/DirtyStateListener';
import { SubmitButton } from 'form/core/SubmitButton';
import { NavigationContext } from 'shared/contexts/NavigationContext';
import { useNavigate } from 'shared/hooks/useNavigate';

import { FormBreadcrumbs } from './FormBreadcrumbs';
import { FormPageLayoutProps } from './FormPageLayout.types';
import { BasePageLayout } from '../BasePageLayout';

function SaveButton(props: {
  formRef: React.RefObject<FormElementRef>;
  exitAfterSubmitRef: React.MutableRefObject<boolean>;
  onSubmittedRef: React.MutableRefObject<() => void>;
  disabled?: boolean;
}) {
  const { formRef, exitAfterSubmitRef, onSubmittedRef, disabled } = props;

  const isMenuDisabled = useRef(false);

  const popupState = usePopupState({
    variant: 'popover',
    popupId: 'save-variants-menu',
  });

  useEffect(() => {
    onSubmittedRef.current = () => {
      popupState.close();
    };
  }, [onSubmittedRef, popupState]);

  const hoverProps = bindHover(popupState);

  return (
    <>
      <SubmitButton
        formRef={formRef}
        grid={false}
        sx={{ ml: 'auto' }}
        startIcon={<SaveIcon />}
        variant="contained"
        activateOnDirty
        disabled={disabled}
        onClick={() => {
          isMenuDisabled.current = true;
          exitAfterSubmitRef.current = false;
          popupState.close();
        }}
        {...bindHover(popupState)}
        onMouseLeave={(e) => {
          isMenuDisabled.current = false;
          hoverProps.onMouseLeave(e);
        }}
        onMouseOver={(e) => {
          if (isMenuDisabled.current) {
            return;
          }

          hoverProps.onMouseOver(e);
        }}
      >
        Сохранить
      </SubmitButton>
      <HoverMenu
        {...bindMenu(popupState)}
        disablePortal
        elevation={0}
        keepMounted
        hideBackdrop
        MenuListProps={{
          sx: { py: 0.25 },
          // sx: { width: popupState.anchorEl && popupState.anchorEl.offsetWidth },
        }}
      >
        <MenuItem
          dense
          onClick={() => {
            exitAfterSubmitRef.current = true;
            formRef.current!.submit();
            popupState.close();
          }}
          sx={{ width: '100%', py: 0, height: 20 }}
        >
          <ExitToApp fontSize="small" sx={{ mr: 1 }} />и выйти
        </MenuItem>
      </HoverMenu>
    </>
  );
}

export function FormPageLayout({
  source,
  getEntityId,
  readOnly,
  breadcrumbs,
  defaultRoute,
  children,
  formProps,
  formSubmitterProps,
  formFetcherProps,
  tagsSlot,
  breadcrumbsDeps,
  hideSaveButton,
  allowUnsavedExit,
  ...rest
}: FormPageLayoutProps) {
  const params = useParams() as Record<string, string>;
  const { setPrevent } = useContext(NavigationContext);
  const entityId = getEntityId ? getEntityId(params) : parseInt(params.id, 10);
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
  const [reload, setReload] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const formControlRef = useRef<any>(null);
  const exitAfterSubmitRef = useRef(false);
  const onSubmittedRef = useRef<() => void>(null);
  const formRef = useRef<FormElementRef>(null);
  const isFirstRender = useRef(true);
  const isDirty = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setReload(true);
    setTimeout(() => {
      setReload(false);
    }, 50);
  }, [entityId]);

  useEffect(() => {
    if (allowUnsavedExit) {
      return;
    }

    setPrevent({
      preventNavigation: () => isDirty.current,
    });

    return () => {
      setPrevent(null);
    };
  }, [setPrevent, allowUnsavedExit]);

  const handleGoBack = () => {
    if (!defaultRoute) {
      return;
    }

    if (locationKey === 'default') {
      navigate(defaultRoute);
      return;
    }

    navigate(-1);
  };

  if (reload) {
    return null;
  }

  return (
    <FormSubmitter
      {...(formSubmitterProps as any)}
      source={source}
      entityId={entityId}
      onSubmit={(item) => {
        if (formSubmitterProps?.onSubmit) {
          formSubmitterProps?.onSubmit(item);
        }

        if (exitAfterSubmitRef.current) {
          setTimeout(() => {
            handleGoBack();
          }, 1);

          exitAfterSubmitRef.current = false;
        }

        if (onSubmittedRef.current) {
          onSubmittedRef.current();
        }
      }}
    >
      <FormFetcher
        source={source}
        entityId={entityId}
        onSelection={(selections) => [...selections, 'isRemoved']}
        onFetch={(item) => {
          setIsRemoved(item.isRemoved);
          return item;
        }}
        {...formFetcherProps}
      >
        <Form
          ref={formRef}
          setControl={(x) => {
            formControlRef.current = x;
          }}
          grid={false}
          readOnly={readOnly || isRemoved}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            '& .MuiGrid-root.MuiGrid-container': {
              alignContent: 'flex-start',
            },
          }}
          {...formProps}
        >
          <DirtyStateListener
            onChange={(value) => {
              isDirty.current = value;
            }}
          />
          <BasePageLayout
            {...rest}
            paperProps={{
              sx: {
                pt: 2,
                px: 2,
                '& .MuiTabs-root': {
                  mt: -2,
                },
              },
            }}
            title={
              <FormBreadcrumbs
                breadcrumbs={breadcrumbs}
                defaultRoute={defaultRoute}
                deps={breadcrumbsDeps}
              />
            }
            actionContent={
              !readOnly &&
              !hideSaveButton && (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  {tagsSlot}
                  {isRemoved && (
                    <Box
                      sx={{
                        border: 'thin solid red',
                        color: 'red',
                        borderRadius: '4px',
                        ml: 'auto',
                        textTransform: 'uppercase',
                        px: 1.5,
                        py: 0.5,
                        display: 'flex',
                      }}
                    >
                      <Typography variant="caption"> В архиве</Typography>
                    </Box>
                  )}
                  {!isRemoved && (
                    <SaveButton
                      formRef={formRef}
                      disabled={isRemoved}
                      exitAfterSubmitRef={exitAfterSubmitRef}
                      onSubmittedRef={onSubmittedRef as any}
                    />
                  )}
                </Box>
              )
            }
          >
            {children}
          </BasePageLayout>
        </Form>
      </FormFetcher>
    </FormSubmitter>
  );
}
