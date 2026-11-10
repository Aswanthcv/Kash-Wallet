from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Wallet,Transaction

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "confirm_password"]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        # create_user hashes the password properly
        validated_data.pop("confirm_password")
        return User.objects.create_user(**validated_data)


class WalletSerializer(serializers.ModelSerializer):
    # computed by the queryset annotation, never stored
    income = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    expense = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    saving = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Wallet
        fields = [
            "id", "name", "initial_balance",
            "income", "expense", "saving", "balance", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_name(self, value):
        value = value.strip()
        user = self.context ["request"].user
        qs = Wallet.objects.filter(user=user, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("You already have a wallet with this name.")
        return value

class TransactionSerializer(serializers.ModelSerializer):
    wallet_name = serializers.CharField(source="wallet.name", read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "wallet", "wallet_name", "type", "amount", "date", "note", "created_at"]
        read_only_fields = ["created_at"]

    def validate_wallet(self, wallet):
        # critical: a user must not be able to post into someone else's wallet
        if wallet.user != self.context["request"].user:
            raise serializers.ValidationError("Invalid wallet.")
        return wallet
