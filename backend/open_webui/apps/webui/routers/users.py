import logging
from typing import Optional

from open_webui.apps.webui.models.auths import Auths
from open_webui.apps.webui.models.chats import Chats
from open_webui.apps.webui.models.users import (
    UserModel,
    UserRoleUpdateForm,
    Users,
    UserSettings,
    UserUpdateForm,
    AccountBillGetForm,
    AccountBillGetFormByMonth,
    AccountBillAddForm,
    AccountBillModel,
    AccountBills,
)
from open_webui.constants import ERROR_MESSAGES
from open_webui.env import SRC_LOG_LEVELS
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from open_webui.utils.utils import get_admin_user, get_password_hash, get_verified_user

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["MODELS"])

router = APIRouter()


############################
# AddAccountBills
############################


@router.post("/add/account_bill", response_model=AccountBillModel)
async def add_account_bill(form_data: AccountBillAddForm):
    return AccountBills.add_account_bill(
        form_data.id,
        form_data.model_id,
        int(time.time()),
        form_data.input_tokens,
        form_data.output_tokens,
        form_data.input_cost,
        form_data.output_cost,
        form_data.amount,
        form_data.year,
        form_data.month
    )


############################
# GetAccountBills
############################


@router.post("/get/account_bills_by_year", response_model=list[AccountBillModel])
async def get_account_bills_by_year(form_data: AccountBillGetForm):
    return AccountBills.get_account_bills_by_year(form_data.id, form_data.year)


@router.post("/get/account_bills_by_year_month", response_model=list[AccountBillModel])
async def get_account_bills_by_year(form_data: AccountBillGetFormByMonth):
    return AccountBills.get_account_bills_by_year_month(form_data.id, form_data.year, form_data.month)


############################
# GetUsers
############################


@router.get("/", response_model=list[UserModel])
async def get_users(skip: int = 0, limit: int = 50, user=Depends(get_admin_user)):
    return Users.get_users(skip, limit)


############################
# User Permissions
############################


@router.get("/permissions/user")
async def get_user_permissions(request: Request, user=Depends(get_admin_user)):
    return request.app.state.config.USER_PERMISSIONS


@router.post("/permissions/user")
async def update_user_permissions(
    request: Request, form_data: dict, user=Depends(get_admin_user)
):
    request.app.state.config.USER_PERMISSIONS = form_data
    return request.app.state.config.USER_PERMISSIONS


############################
# UpdateUserRole
############################


@router.post("/update/role", response_model=Optional[UserModel])
async def update_user_role(form_data: UserRoleUpdateForm, user=Depends(get_admin_user)):
    if user.id != form_data.id and form_data.id != Users.get_first_user().id:
        return Users.update_user_role_by_id(form_data.id, form_data.role)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ERROR_MESSAGES.ACTION_PROHIBITED,
    )


############################
# GetUserSettingsBySessionUser
############################


@router.get("/user/settings", response_model=Optional[UserSettings])
async def get_user_settings_by_session_user(user=Depends(get_verified_user)):
    user = Users.get_user_by_id(user.id)
    if user:
        return user.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


@router.get("/user/{user_id}/settings", response_model=Optional[UserSettings])
async def get_user_settings_by_user_id(user_id: str, user=Depends(get_verified_user)):
    print(f"get_user_settings_by_user_id: {user_id}")
    userRet = Users.get_user_by_id(user_id)
    if userRet:
        print(f"get_user_settings_by_user_id ret user: {userRet}")

        return userRet.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )

############################
# UpdateUserSettingsBySessionUser
############################


@router.post("/user/settings/update", response_model=UserSettings)
async def update_user_settings_by_session_user(
    form_data: UserSettings, user=Depends(get_verified_user)
):
    user = Users.update_user_by_id(user.id, {"settings": form_data.model_dump()})
    if user:
        return user.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserInfoBySessionUser
############################


@router.get("/user/info", response_model=Optional[dict])
async def get_user_info_by_session_user(user=Depends(get_verified_user)):
    user = Users.get_user_by_id(user.id)
    if user:
        return user.info
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# UpdateUserInfoBySessionUser
############################


@router.post("/user/info/update", response_model=Optional[dict])
async def update_user_info_by_session_user(
    form_data: dict, user=Depends(get_verified_user)
):
    user = Users.get_user_by_id(user.id)
    if user:
        if user.info is None:
            user.info = {}

        user = Users.update_user_by_id(user.id, {"info": {**user.info, **form_data}})
        if user:
            return user.info
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MESSAGES.USER_NOT_FOUND,
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserById
############################


class UserResponse(BaseModel):
    name: str
    profile_image_url: str


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, user=Depends(get_verified_user)):
    # Check if user_id is a shared chat
    # If it is, get the user_id from the chat
    if user_id.startswith("shared-"):
        chat_id = user_id.replace("shared-", "")
        chat = Chats.get_chat_by_id(chat_id)
        if chat:
            user_id = chat.user_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MESSAGES.USER_NOT_FOUND,
            )

    user = Users.get_user_by_id(user_id)

    if user:
        return UserResponse(name=user.name, profile_image_url=user.profile_image_url)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# UpdateUserById
############################


@router.post("/{user_id}/update", response_model=Optional[UserModel])
async def update_user_by_id(
    user_id: str,
    form_data: UserUpdateForm,
    session_user=Depends(get_admin_user),
):
    user = Users.get_user_by_id(user_id)

    if user:
        if form_data.cell_phone != user.cell_phone:
            cell_phone_user = Users.get_user_by_cell_phone(form_data.cell_phone)
            if cell_phone_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=ERROR_MESSAGES.CELL_PHONE_TAKEN,
                )

        if form_data.password:
            hashed = get_password_hash(form_data.password)
            log.debug(f"hashed: {hashed}")
            Auths.update_user_password_by_id(user_id, hashed)

        ui = user.settings.ui
        print(f"form_data.amount: {form_data.amount}")
        if form_data.amount is not None:
            balance = ui.get("balance")
            if balance is not None:
                balance["amount"] = form_data.amount
                user.settings.ui = ui
                print(f"user settings:{user.settings.ui}")

        Auths.update_cell_phone_by_id(user_id, form_data.cell_phone)
        updated_user = Users.update_user_by_id(
            user_id,
            {
                "name": form_data.name,
                "cell_phone": form_data.cell_phone,
                "email": form_data.email.lower(),
                "profile_image_url": form_data.profile_image_url,
                "settings": user.settings.model_dump()
            },
        )

        if updated_user:
            return updated_user

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.DEFAULT(),
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ERROR_MESSAGES.USER_NOT_FOUND,
    )


############################
# DeleteUserById
############################


@router.delete("/{user_id}", response_model=bool)
async def delete_user_by_id(user_id: str, user=Depends(get_admin_user)):
    if user.id != user_id:
        result = Auths.delete_auth_by_id(user_id)

        if result:
            return True

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MESSAGES.DELETE_USER_ERROR,
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ERROR_MESSAGES.ACTION_PROHIBITED,
    )
