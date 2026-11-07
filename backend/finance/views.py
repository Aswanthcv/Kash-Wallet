from decimal import Decimal

from django.db.models import DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import TransactionFilter
from .models import Transaction, Wallet
from .serializers import RegisterSerializer, TransactionSerializer, WalletSerializer


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


# ---- Summary ----

ZERO = Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2))


def money(value):
    """Format any number as a 2-decimal string, e.g. '1750.00'."""
    return f"{Decimal(str(value)):.2f}"


def totals(qs):
    """Sum income, expense and saving for any Transaction queryset."""
    def s(tx_type):
        return Coalesce(Sum("amount", filter=Q(type=tx_type)), ZERO)

    return qs.aggregate(income=s("INCOME"), expense=s("EXPENSE"), saving=s("SAVING"))


class SummaryView(APIView):
    def get(self, request):
        wallets = Wallet.objects.filter(user=request.user)
        txs = Transaction.objects.filter(wallet__user=request.user)

        initial_total = Decimal(str(
            wallets.aggregate(t=Coalesce(Sum("initial_balance"), ZERO))["t"]
        ))
        overall = {k: Decimal(str(v)) for k, v in totals(txs).items()}

        # this calendar month, in the project's timezone (Asia/Kolkata)
        now = timezone.localtime()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        month = {
            k: Decimal(str(v))
            for k, v in totals(txs.filter(date__gte=month_start, date__lt=next_month)).items()
        }

        return Response({
            "total_balance": money(initial_total + overall["income"] - overall["expense"] - overall["saving"]),
            "total_saved": money(overall["saving"]),
            "wallet_count": wallets.count(),
            "this_month": {
                "income": money(month["income"]),
                "expense": money(month["expense"]),
                "saving": money(month["saving"]),
            },
        })