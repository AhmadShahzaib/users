import { ForbiddenException } from '@nestjs/common';

export const checkStatusChangePermission = async (
  isActive: boolean,
  permissions: any[] = [],
) => {
  const permission = permissions?.find((permission) => {
    return (
      (isActive && !permission.canActivate) ||
      (!isActive && !permission.canDeactivate)
    );
  });
  if (permission) {
    throw new ForbiddenException(
      "You don't have Permission to perform this action.",
    );
  }
};
