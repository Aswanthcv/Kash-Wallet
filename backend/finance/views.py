from decimal import Decimal

from django.db.models import DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from django_filters.rest_framework import DjangoFilterBackend
from .filters import TransactionFilter
from .models import Transaction, Wallet

from .models import Wallet
from .serializers import RegisterSerializer, WalletSerializer, TransactionSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  # default is IsAuthenticated, so open this one up


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer

    def get_queryset(self):
        zero = Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2))

        def total(tx_type):
            return Coalesce(
                Sum("transactions__amount", filter=Q(transactions__type=tx_type)), zero
            )

        return (
            Wallet.objects.filter(user=self.request.user)  # users only see their own
            .annotate(
                income=total("INCOME"),
                expense=total("EXPENSE"),
                saving=total("SAVING"),
            )
            .annotate(balance=F("initial_balance") + F("income") - F("expense") - F("saving"))
        )

    def _reload(self, serializer):
        # re-fetch so the response includes fresh computed balances
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        self._reload(serializer)

    def perform_update(self, serializer):
        serializer.save()
        self._reload(serializer)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TransactionFilter

    def get_queryset(self):
        # only transactions in the user's own wallets
        return Transaction.objects.filter(wallet__user=self.request.user).select_related("wallet")        