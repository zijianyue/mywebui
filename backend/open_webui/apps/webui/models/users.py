import time
from typing import Optional

from open_webui.apps.webui.internal.db import Base, JSONField, get_db
from open_webui.apps.webui.models.chats import Chats
from pydantic import BaseModel, ConfigDict
from sqlalchemy import BigInteger, Column, String, Text, ForeignKey


####################
# User Account Bill
####################


class AccountBill(Base):
    __tablename__ = "account_bill"

    id = Column(String, ForeignKey('user.id'), primary_key=True)
    expense_time = Column(BigInteger, primary_key=True) # timestamp
    input_tokens = Column(String)
    output_tokens = Column(String)
    input_cost = Column(String)
    output_cost = Column(String)
    amount = Column(String)
    year = Column(BigInteger)
    month = Column(BigInteger)


class AccountBillModel(BaseModel):
    id: str
    expense_time: int
    input_tokens: str
    output_tokens: str
    input_cost: str
    output_cost: str
    amount: str
    year: int
    month: int


####################
# User DB Schema
####################


class User(Base):
    __tablename__ = "user"

    id = Column(String, primary_key=True)
    name = Column(String)
    cell_phone = Column(String)
    email = Column(String)
    role = Column(String)
    profile_image_url = Column(Text)

    last_active_at = Column(BigInteger)
    updated_at = Column(BigInteger)
    created_at = Column(BigInteger)

    api_key = Column(String, nullable=True, unique=True)
    settings = Column(JSONField, nullable=True)
    info = Column(JSONField, nullable=True)

    oauth_sub = Column(Text, unique=True)


class UserSettings(BaseModel):
    ui: Optional[dict] = {}
    model_config = ConfigDict(extra="allow")
    pass


class UserModel(BaseModel):
    id: str
    name: str
    cell_phone: str
    email: str
    role: str = "pending"
    profile_image_url: str

    last_active_at: int  # timestamp in epoch
    updated_at: int  # timestamp in epoch
    created_at: int  # timestamp in epoch

    api_key: Optional[str] = None
    settings: Optional[UserSettings] = None
    info: Optional[dict] = None

    oauth_sub: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


####################
# Forms
####################


class AccountBillGetForm(BaseModel):
    id: str
    year: int


class AccountBillAddForm(BaseModel):
    id: str
    input_tokens: str
    output_tokens: str
    input_cost: str
    output_cost: str
    amount: str
    year: int
    month: int


class UserRoleUpdateForm(BaseModel):
    id: str
    role: str


class UserUpdateForm(BaseModel):
    name: str
    cell_phone: str
    email: str
    profile_image_url: str
    password: Optional[str] = None
    amount: Optional[str] = None


class AccountBillTable:
    def get_account_bills_by_year(self, id: str, year: int):
        try:
            with get_db() as db:
                acbs = db.query(AccountBill).filter_by(id=id, year=year).all()
                if acbs:
                    return acbs
                else:
                    return []
        except Exception as e:
            return []
        
    def get_account_bills_by_year_month(self, id: str, year: int, month: int):
        try:
            with get_db() as db:
                acbs = db.query(AccountBill).filter_by(id=id, year=year, month=month).all()
                if acbs:
                    return acbs
                else:
                    return []
        except Exception as e:
            return []

    def add_account_bill(self,
        id: str,
        expense_time: int,
        input_tokens: str,
        output_tokens: str,
        input_cost: str,
        output_cost: str,
        amount: str,
        year: int,
        month: int):
        with get_db() as db:

            newBill = AccountBillModel(**{
                    "id": id,
                    "expense_time": expense_time,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "input_cost": input_cost,
                    "output_cost": output_cost,
                    "amount": amount,
                    "year": year,
                    "month": month
                }
            )
            result = AccountBill(**newBill.model_dump())
            db.add(result)
            db.commit()
            db.refresh(result)

            if result:
                return newBill
            else:
                return None

class UsersTable:
    def insert_new_user(
        self,
        id: str,
        name: str,
        cell_phone: str,
        email: str,
        profile_image_url: str = "/user.png",
        role: str = "pending",
        oauth_sub: Optional[str] = None,
    ) -> Optional[UserModel]:
        with get_db() as db:
            user = UserModel(
                **{
                    "id": id,
                    "name": name,
                    "cell_phone": cell_phone,
                    "email": email,
                    "role": role,
                    "profile_image_url": profile_image_url,
                    "last_active_at": int(time.time()),
                    "created_at": int(time.time()),
                    "updated_at": int(time.time()),
                    "oauth_sub": oauth_sub,
                }
            )
            result = User(**user.model_dump())
            db.add(result)
            db.commit()
            db.refresh(result)
            if result:
                return user
            else:
                return None

    def get_user_by_id(self, id: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def get_user_by_api_key(self, api_key: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                user = db.query(User).filter_by(api_key=api_key).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def get_user_by_email(self, email: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                user = db.query(User).filter_by(email=email).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def get_user_by_cell_phone(self, cell_phone: str) -> Optional[UserModel]:
        try:
            with get_db() as db:

                user = db.query(User).filter_by(cell_phone=cell_phone).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def get_user_by_oauth_sub(self, sub: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                user = db.query(User).filter_by(oauth_sub=sub).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def get_users(self, skip: int = 0, limit: int = 50) -> list[UserModel]:
        with get_db() as db:
            users = (
                db.query(User)
                # .offset(skip).limit(limit)
                .all()
            )
            return [UserModel.model_validate(user) for user in users]

    def get_num_users(self) -> Optional[int]:
        with get_db() as db:
            return db.query(User).count()

    def get_first_user(self) -> UserModel:
        try:
            with get_db() as db:
                user = db.query(User).order_by(User.created_at).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def update_user_role_by_id(self, id: str, role: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                db.query(User).filter_by(id=id).update({"role": role})
                db.commit()
                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def update_user_profile_image_url_by_id(
        self, id: str, profile_image_url: str
    ) -> Optional[UserModel]:
        try:
            with get_db() as db:
                db.query(User).filter_by(id=id).update(
                    {"profile_image_url": profile_image_url}
                )
                db.commit()

                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def update_user_last_active_by_id(self, id: str) -> Optional[UserModel]:
        try:
            with get_db() as db:
                db.query(User).filter_by(id=id).update(
                    {"last_active_at": int(time.time())}
                )
                db.commit()

                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def update_user_oauth_sub_by_id(
        self, id: str, oauth_sub: str
    ) -> Optional[UserModel]:
        try:
            with get_db() as db:
                db.query(User).filter_by(id=id).update({"oauth_sub": oauth_sub})
                db.commit()

                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
        except Exception:
            return None

    def update_user_by_id(self, id: str, updated: dict) -> Optional[UserModel]:
        try:
            with get_db() as db:
                db.query(User).filter_by(id=id).update(updated)
                db.commit()

                user = db.query(User).filter_by(id=id).first()
                return UserModel.model_validate(user)
                # return UserModel(**user.dict())
        except Exception:
            return None

    def delete_user_by_id(self, id: str) -> bool:
        try:
            # Delete User Chats
            result = Chats.delete_chats_by_user_id(id)

            if result:
                with get_db() as db:
                    # Delete User
                    db.query(User).filter_by(id=id).delete()
                    db.commit()

                return True
            else:
                return False
        except Exception:
            return False

    def update_user_api_key_by_id(self, id: str, api_key: str) -> str:
        try:
            with get_db() as db:
                result = db.query(User).filter_by(id=id).update({"api_key": api_key})
                db.commit()
                return True if result == 1 else False
        except Exception:
            return False

    def get_user_api_key_by_id(self, id: str) -> Optional[str]:
        try:
            with get_db() as db:
                user = db.query(User).filter_by(id=id).first()
                return user.api_key
        except Exception:
            return None


Users = UsersTable()
AccountBills = AccountBillTable()